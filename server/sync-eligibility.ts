import * as path from "path";
import type { FileEntry } from "./conflict-detection";
import { isBinaryFile, MAX_FILE_SIZE, shouldIgnorePath, type SyncFilesystem } from "./sync-mechanics";
import { computeGitBlobSha } from "./sync-plan";

export interface TreeFile { path: string; type: string; sha: string; size?: number }
export type FileOutcome =
  | { path: string; state: "eligible"; file: FileEntry; rawSha?: string }
  | { path: string; state: "absent" | "excluded" | "oversized" | "failed-read" };
type Snapshot = Map<string, FileOutcome>;
type Transport = Pick<typeof import("./github"), "getFileContent" | "getFileContentAtCommit">;
type KnownContent = Map<string, string>;

export class SnapshotReadTimeout extends Error {
  constructor() {
    super("GitHub file comparison timed out. No files were changed. Check sync status before retrying.");
  }
}

// This deadline covers only a single immutable content read, never an upload,
// publication, local write or the overall mutation. Late reads cannot resume
// the failed comparison or proceed to writes.
export async function readSnapshotContent<T>(read: () => Promise<T>, milliseconds = 20_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(read),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SnapshotReadTimeout()), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const BLOCKED_ELIGIBILITY_PLAN =
  "Pending conflicts contain files incompatible with the sync eligibility policy. Cancel these conflicts, then retry the sync.";

export class EligibilityError extends Error {
  constructor(public outcomes: FileOutcome[], binary = false) {
    super(binary
      ? `Sync blocked: ${outcomes.length} binary file(s) need manual reconciliation. No files were changed. Reconcile these files outside the text conflict editor, then retry.`
      : `Sync blocked: could not read ${outcomes.length} file(s). No files were changed. Fix the read errors and retry.`);
  }
}

export function oversizedMessage(count: number): string {
  return count ? ` Skipped ${count} file(s) larger than 7 MiB; existing copies were preserved.` : "";
}

export function readLocalFile(fs: SyncFilesystem, root: string, name: string): FileOutcome {
  if (shouldIgnorePath(name)) return { path: name, state: "excluded" };
  if (!path.resolve(root, name).startsWith(path.resolve(root) + path.sep))
    return { path: name, state: "excluded" };
  try {
    // Remote-only paths were not visited by the directory scan. Check every
    // component without following links before probing or reading the target.
    let current = path.resolve(root);
    for (const component of path.relative(current, path.resolve(root, name)).split(path.sep)) {
      current = path.join(current, component);
      if (fs.lstatSync(current).isSymbolicLink()) return { path: name, state: "excluded" };
    }
    const stat = fs.statSync(path.join(root, name));
    if (!stat.isFile()) return { path: name, state: "excluded" };
    if (stat.size > MAX_FILE_SIZE) return { path: name, state: "oversized" };
    const bytes = fs.readFileSync(path.join(root, name));
    if (bytes.length > MAX_FILE_SIZE) return { path: name, state: "oversized" };
    const binary = isBinaryFile(name);
    return { path: name, state: "eligible", rawSha: computeGitBlobSha(bytes), file: {
      path: name, content: bytes.toString(binary ? "base64" : "utf8"),
      ...(binary ? { encoding: "base64" as const } : {}),
    } };
  } catch (error) {
    return { path: name, state: (error as NodeJS.ErrnoException).code === "ENOENT" ? "absent" : "failed-read" };
  }
}

export function collectLocalSnapshot(fs: SyncFilesystem, root: string): Snapshot {
  const snapshot: Snapshot = new Map();
  function visit(dir: string) {
    let entries;
    try { entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true }); }
    catch { snapshot.set(dir || ".", { path: dir || ".", state: "failed-read" }); return; }
    for (const entry of entries) {
      const name = dir ? `${dir}/${entry.name}` : entry.name;
      if (shouldIgnorePath(entry.isDirectory() ? `${name}/_` : name)) continue;
      if (entry.isDirectory()) visit(name);
      else snapshot.set(name, entry.isFile()
        ? readLocalFile(fs, root, name)
        : { path: name, state: "excluded" });
    }
  }
  visit("");
  return snapshot;
}

async function remoteSnapshot(tree: TreeFile[], transport: Transport, owner: string, repo: string, ref: string, base = false, known: KnownContent = new Map()): Promise<Snapshot> {
  const snapshot: Snapshot = new Map();
  for (const item of tree) {
    if (item.type !== "blob" || shouldIgnorePath(item.path)) continue;
    if (item.size !== undefined && item.size > MAX_FILE_SIZE) {
      snapshot.set(item.path, { path: item.path, state: "oversized" });
      continue;
    }
    try {
      const encoding = isBinaryFile(item.path) ? "base64" : "utf-8";
      const key = `${item.sha}:${encoding}`;
      const content = known.has(key) ? known.get(key)! : await readSnapshotContent(() => base
        ? transport.getFileContentAtCommit(owner, repo, item.path, ref, encoding)
        : transport.getFileContent(owner, repo, item.path, ref, encoding));
      if (content === null) throw new Error("Listed file could not be downloaded");
      const bytes = Buffer.from(content, encoding === "base64" ? "base64" : "utf8");
      if (bytes.length <= MAX_FILE_SIZE && computeGitBlobSha(bytes) === item.sha) known.set(key, content);
      snapshot.set(item.path, bytes.length > MAX_FILE_SIZE
        ? { path: item.path, state: "oversized" }
        : { path: item.path, state: "eligible", file: {
          path: item.path, content, ...(encoding === "base64" ? { encoding } : {}),
        } });
    } catch (error) {
      if (error instanceof SnapshotReadTimeout) throw error;
      snapshot.set(item.path, { path: item.path, state: "failed-read" });
    }
  }
  return snapshot;
}

// An omitted entry is absence only in a successfully enumerated snapshot.
// Every counterpart shares a path's exclusion/size decision before diffing.
export async function prepareEligibility(
  fs: SyncFilesystem, transport: Transport, root: string, owner: string, repo: string,
  remoteTree: TreeFile[], baseTree: TreeFile[], baseRef?: string, remoteRef?: string,
) {
  if (remoteTree.length && !remoteRef) throw new Error("Remote snapshot requires a captured commit");
  const local = collectLocalSnapshot(fs, root);
  const known: KnownContent = new Map();
  for (const item of Array.from(local.values())) {
    if (item.state !== "eligible") continue;
    const encoding = item.file.encoding ?? "utf-8";
    const bytes = Buffer.from(item.file.content, encoding === "base64" ? "base64" : "utf8");
    // Invalid UTF-8 must not be reused as if it preserved the original bytes.
    if (computeGitBlobSha(bytes) === item.rawSha) known.set(`${item.rawSha}:${encoding}`, item.file.content);
  }
  const remote = await remoteSnapshot(remoteTree, transport, owner, repo, remoteRef ?? "", false, known);
  const base = baseRef ? await remoteSnapshot(baseTree, transport, owner, repo, baseRef, true, known) : new Map<string, FileOutcome>();
  const paths = new Set([...Array.from(local.keys()), ...Array.from(remote.keys()), ...Array.from(base.keys())]);
  // Probe remote-only paths: unreadable is not the same as absent.
  for (const name of Array.from(paths)) if (!local.has(name)) local.set(name, readLocalFile(fs, root, name));
  const skipped: string[] = [];
  const excluded = new Set<string>();
  const failed: FileOutcome[] = [];
  for (const name of Array.from(paths)) {
    const sides = [local.get(name), remote.get(name), base.get(name)];
    if (sides.some((side) => side?.state === "oversized" || side?.state === "excluded")) {
      if (sides.some((side) => side?.state === "oversized")) skipped.push(name);
      else excluded.add(name);
      local.delete(name); remote.delete(name); base.delete(name);
    } else if (sides.some((side) => side?.state === "failed-read")) {
      failed.push({ path: name, state: "failed-read" });
    }
  }
  if (failed.length) throw new EligibilityError(failed);
  const files = (snapshot: Snapshot) => Array.from(snapshot.values())
    .flatMap((item) => item.state === "eligible" ? [item.file] : []);
  const localHashes = Object.fromEntries(Array.from(local.entries()).flatMap<[string, string | null]>(([name, entry]) =>
    entry.state === "eligible" ? [[name, entry.rawSha!]] :
      entry.state === "absent" ? [[name, null]] : []));
  return { local: files(local), localHashes, remote: files(remote), base: files(base), skipped, excluded: Array.from(excluded),
    outcomes: Array.from(paths).map((name) => ({
      path: name,
      local: local.get(name)?.state ?? (excluded.has(name) ? "excluded" : skipped.includes(name) ? "oversized" : "absent"),
      remote: remote.get(name)?.state ?? (excluded.has(name) ? "excluded" : skipped.includes(name) ? "oversized" : "absent"),
      base: base.get(name)?.state ?? (excluded.has(name) ? "excluded" : skipped.includes(name) ? "oversized" : "absent"),
    })) };
}

export function assertBinarySafety(snapshot: Awaited<ReturnType<typeof prepareEligibility>>, hasBase: boolean) {
  const local = new Map(snapshot.local.map((f) => [f.path, f.content]));
  const remote = new Map(snapshot.remote.map((f) => [f.path, f.content]));
  const base = new Map(snapshot.base.map((f) => [f.path, f.content]));
  const conflicts: FileOutcome[] = [];
  for (const name of Array.from(new Set([...Array.from(local.keys()), ...Array.from(remote.keys()), ...Array.from(base.keys())]))) {
    if (!isBinaryFile(name)) continue;
    const l = local.get(name), r = remote.get(name), b = base.get(name);
    if (l === r) continue;
    if ((!hasBase && l !== undefined && r !== undefined)
      || (hasBase && l !== b && r !== b)) {
      conflicts.push({ path: name, state: "eligible", file: { path: name, content: "" } });
    }
  }
  if (conflicts.length) throw new EligibilityError(conflicts, true);
}

export function incompatiblePendingPlan(pending: {
  conflicts: { path: string }[]; safeToUpdate: FileEntry[]; safeToDelete?: string[];
}): boolean {
  return pending.conflicts.some((f) => isBinaryFile(f.path) || shouldIgnorePath(f.path))
    || pending.safeToUpdate.some((f) => isBinaryFile(f.path) && f.encoding !== "base64")
    || (pending.safeToDelete ?? []).some((p) => isBinaryFile(p) || shouldIgnorePath(p))
    || [...pending.conflicts, ...pending.safeToUpdate].some((f) => {
      if (shouldIgnorePath(f.path)) return true;
      const entry = f as FileEntry;
      if (typeof entry.content === "string")
        return Buffer.byteLength(entry.content, entry.encoding === "base64" ? "base64" : "utf8") > MAX_FILE_SIZE;
      const conflict = f as unknown as { localContent?: string; remoteContent?: string; baseContent?: string };
      return [conflict.localContent, conflict.remoteContent, conflict.baseContent]
        .some((text) => typeof text === "string" && Buffer.byteLength(text) > MAX_FILE_SIZE);
    });
}
