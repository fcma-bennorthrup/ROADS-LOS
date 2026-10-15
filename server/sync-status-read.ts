import type { FileEntry } from "./conflict-detection";
import { collectLocalSnapshot, readLocalFile, EligibilityError, type TreeFile } from "./sync-eligibility";
import { isBinaryFile, MAX_FILE_SIZE, shouldIgnorePath, type SyncFilesystem } from "./sync-mechanics";

export class StatusReadTimeout extends Error {
  constructor() {
    super("GitHub sync status timed out. No files were changed. Try checking status again.");
  }
}

// Only read operations may use this deadline. A late transport response cannot
// resume the caller or update its cache. Never apply Promise.race to mutations.
export function statusReadDeadline(milliseconds = 20_000) {
  const expires = Date.now() + milliseconds;
  function check() {
    if (Date.now() >= expires) throw new StatusReadTimeout();
  }
  async function read<T>(operation: () => Promise<T>): Promise<T> {
    check();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        Promise.resolve().then(operation),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new StatusReadTimeout()), Math.max(0, expires - Date.now()));
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return { read, check };
}

// Status needs tree hashes and eligibility, not remote file contents. Missing
// tree sizes still require a pinned read; never assume those files are eligible.
export async function statusLocalFiles(
  fs: SyncFilesystem, root: string, tree: TreeFile[],
  readMissingSize: (file: TreeFile) => Promise<number>,
) {
  const local = collectLocalSnapshot(fs, root);
  const remoteSizes = new Map<string, number>();
  for (const file of tree) {
    if (file.type !== "blob" || shouldIgnorePath(file.path)) continue;
    if (!local.has(file.path)) local.set(file.path, readLocalFile(fs, root, file.path));
    const side = local.get(file.path)!;
    if (side.state === "excluded" || side.state === "oversized") continue;
    const size = file.size ?? await readMissingSize(file);
    if (!Number.isFinite(size) || size < 0) throw new Error("Invalid remote file size");
    remoteSizes.set(file.path, size);
  }
  const files: FileEntry[] = [];
  const excluded = new Set<string>();
  for (const [name, side] of Array.from(local.entries())) {
    if (side.state === "excluded" || side.state === "oversized" ||
        (remoteSizes.get(name) ?? 0) > MAX_FILE_SIZE) {
      excluded.add(name);
    } else if (side.state === "failed-read") {
      throw new EligibilityError([side]);
    } else if (side.state === "eligible") {
      files.push(side.file);
    }
  }
  return { local: files, tree: tree.filter(file => !excluded.has(file.path)) };
}

export function statusContentSize(name: string, content: string | null): number {
  if (content === null) throw new Error("Listed file could not be downloaded");
  return Buffer.byteLength(content, isBinaryFile(name) ? "base64" : "utf8");
}
