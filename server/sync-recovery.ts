import { AsyncLocalStorage } from "node:async_hooks";
import * as path from "node:path";
import { computeGitBlobSha } from "./sync-plan";
import type { SyncRouteAdapters } from "./routes";
import type { RequestHandler } from "express";
import type { PendingConflicts } from "./pending-conflicts";
import { StaleSyncError } from "./sync-snapshot";

export const INCOMPLETE_SYNC =
  "Sync incomplete. The checkpoint was not advanced. Some changes may already have been applied. Review the result before retrying.";

type Step = {
  path: string;
  action: "write" | "delete" | "upload";
  before: string | null;
  after: string | null;
  state: "not-attempted" | "staged" | "uncertain" | "completed" | "failed";
};
type Record = {
  version: 1;
  operation: string;
  checkpoint: string | null;
  complete: boolean;
  request: string;
  steps: Step[];
  remote?: { owner: string; repo: string; before: string };
  pendingFile?: string | null;
};
type Session = { record: Record; started: boolean; checkpoint?: string; clear?: boolean;
  pending?: PendingConflicts; remoteHead?: string };

// The journal contains hashes and paths, never source contents or credentials.
// An unfinished journal is authoritative over a possibly interrupted checkpoint
// write. The checkpoint and pending-generation pointer commit in one rename.
export function createSyncRecovery(original: SyncRouteAdapters) {
  const context = new AsyncLocalStorage<Session>();
  const fs = original.filesystem;
  const root = path.resolve(original.cwd());
  const journal = path.join(root, ".local/github-sync-recovery.json");
  function read(): Record | null {
    if (!fs.existsSync(journal)) return null;
    const record = JSON.parse(fs.readFileSync(journal, "utf8"));
    if (record.version !== 1 || !Array.isArray(record.steps) ||
        typeof record.complete !== "boolean" ||
        !(record.checkpoint === null || typeof record.checkpoint === "string")) {
      throw new Error("Invalid sync recovery record. Review local sync metadata before retrying.");
    }
    return record;
  }
  function save(session: Session) {
    if (session.record.pendingFile === undefined) {
      session.record.pendingFile = storePending(pending());
    }
    fs.mkdirSync(path.dirname(journal), { recursive: true });
    // Same-directory replacement keeps the last complete record readable if
    // writing the next record is interrupted. No multi-file transaction claimed.
    fs.writeFileSync(journal + ".tmp", JSON.stringify(session.record), "utf8");
    fs.renameSync(journal + ".tmp", journal);
    session.started = true;
  }
  function storePending(value: PendingConflicts | null): string | null {
    if (!value) return null;
    const bytes = JSON.stringify(value);
    const name = computeGitBlobSha(Buffer.from(bytes));
    const file = path.join(root, ".local/github-sync-conflicts", name + ".json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + ".tmp", bytes, "utf8");
    fs.renameSync(file + ".tmp", file);
    return name;
  }
  function pending(): PendingConflicts | null {
    const record = read();
    if (record?.pendingFile === undefined) return original.conflicts.getPendingConflicts();
    if (record.pendingFile === null) return null;
    if (!/^[a-f0-9]{40}$/.test(record.pendingFile)) throw new Error("Invalid pending conflict generation");
    const bytes = fs.readFileSync(path.join(root, ".local/github-sync-conflicts", record.pendingFile + ".json"), "utf8");
    if (computeGitBlobSha(Buffer.from(bytes)) !== record.pendingFile) throw new Error("Invalid pending conflict generation");
    return JSON.parse(bytes);
  }
  function cleanPendingGenerations(active: string | null | undefined) {
    const directory = path.join(root, ".local/github-sync-conflicts");
    if (!fs.existsSync(directory)) return;
    // Only successful completion retires old content-bearing generations.
    // Interrupted operations retain their original generation for manual retry.
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isFile() && /^[a-f0-9]{40}\.json(?:\.tmp)?$/.test(entry.name) &&
          entry.name !== `${active}.json`) fs.unlinkSync(path.join(directory, entry.name));
    }
  }
  async function assertHead(owner: string, repo: string, expected: string) {
    const ref = await original.github.githubRequest(`/repos/${owner}/${repo}/git/ref/heads/main`);
    if (ref.object?.sha !== expected) throw new StaleSyncError();
    const session = context.getStore();
    if (session) session.remoteHead = expected;
  }
  function localHash(name: string): string | null {
    const full = path.resolve(root, name);
    if (!full.startsWith(root + path.sep)) throw new Error("Invalid recovery path");
    try {
      let current = root;
      for (const part of path.relative(root, full).split(path.sep)) {
        current = path.join(current, part);
        if (fs.lstatSync(current).isSymbolicLink()) throw new Error("Recovery cannot follow symbolic links");
      }
      return computeGitBlobSha(fs.readFileSync(full));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  function changeLocal(file: string, after: string | null, action: Step["action"], change: () => void) {
    const session = context.getStore();
    if (!session) return change();
    const name = path.relative(root, file);
    let step = session.record.steps.find((s) => s.path === name && s.action === action && s.state === "not-attempted");
    if (!step) {
      step = { path: name, action, before: localHash(name), after, state: "uncertain" };
      session.record.steps.push(step);
    }
    step.state = "uncertain";
    save(session);
    try {
      change();
      step.state = "completed";
      save(session);
    } catch (error) {
      step.state = "failed";
      try { save(session); } catch { /* prior intent remains uncertain */ }
      throw error;
    }
  }
  function planLocal(files: { path: string; content: string | null; encoding?: "utf-8" | "base64" }[]) {
    if (!files.length) return;
    const session = context.getStore();
    if (!session) throw new Error("Sync plan requires an operation");
    // Complete the preflight before persisting intent or mutating any file.
    const steps = files.map((file): Step => ({
      path: file.path, before: localHash(file.path),
      after: file.content === null ? null :
        computeGitBlobSha(Buffer.from(file.content, file.encoding === "base64" ? "base64" : "utf8")),
      action: file.content === null ? "delete" : "write", state: "not-attempted",
    }));
    for (const step of steps) {
      const index = session.record.steps.findIndex((s) => s.path === step.path && s.action === step.action);
      if (index < 0) session.record.steps.push(step);
      else session.record.steps[index] = { ...step, before: session.record.steps[index].before };
    }
    save(session);
  }
  async function verify(record: Record) {
    for (const step of record.steps.filter((s) => s.action !== "upload")) {
      const actual = localHash(step.path);
      if (actual !== step.before && actual !== step.after)
        throw new Error("Recovery blocked: a local file differs from both recorded states. Reconcile it before retrying.");
    }
    if (record.remote) {
      const { owner, repo, before } = record.remote;
      const current = await original.github.getRepoTree(owner, repo);
      if (current.commitSha !== before) {
        const hashes = new Map(current.tree.filter((f: any) => f.type === "blob").map((f: any) => [f.path, f.sha]));
        if (!record.steps.filter((s) => s.action === "upload").every((s) => (hashes.get(s.path) ?? null) === s.after))
          throw new Error("Recovery blocked: the remote result is uncertain. Review the remote changes before retrying.");
      }
    }
  }
  async function verifyFinished(record: Record) {
    for (const step of record.steps.filter((s) => s.action !== "upload")) {
      if (localHash(step.path) !== step.after)
        throw new Error("Recovery is not complete; retry the original operation.");
    }
    if (record.remote) {
      const current = await original.github.getRepoTree(record.remote.owner, record.remote.repo);
      const hashes = new Map(current.tree.filter((f: any) => f.type === "blob").map((f: any) => [f.path, f.sha]));
      if (!record.steps.filter((s) => s.action === "upload").every((s) => (hashes.get(s.path) ?? null) === s.after))
        throw new Error("Recovery is not complete; remote changes remain unconfirmed.");
    }
  }
  function checkpoint() {
    const recovery = read();
    // Once present, this record is the completion authority. The legacy file
    // may have been replaced just before an interrupted completion write.
    return recovery ? recovery.checkpoint : original.checkpoint.getLastSyncedCommit();
  }
  const adapters: SyncRouteAdapters = {
    ...original,
    filesystem: {
      ...fs,
      writeFileSync(file, data, options) {
        const bytes = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data as Uint8Array);
        changeLocal(String(file), computeGitBlobSha(bytes), "write", () => fs.writeFileSync(file, data, options));
      },
      unlinkSync(file) { changeLocal(String(file), null, "delete", () => fs.unlinkSync(file)); },
    },
    checkpoint: {
      getLastSyncedCommit: checkpoint,
      setLastSyncedCommit(sha) {
        const session = context.getStore();
        if (!session) throw new Error("Sync checkpoint requires an operation");
        save(session);
        session.checkpoint = sha;
      },
    },
    conflicts: {
      ...original.conflicts,
      getPendingConflicts: () => context.getStore()?.pending ?? pending(),
      setPendingConflicts(value) {
        const session = context.getStore();
        if (!session) throw new Error("Pending conflicts require an operation");
        save(session);
        session.pending = value;
        session.clear = false;
      },
      clearPendingConflicts() {
        const session = context.getStore();
        if (session) session.clear = true;
        else original.conflicts.clearPendingConflicts();
      },
    },
    github: { ...original.github },
  };
  for (const method of ["pushCodebase", "pushCodebaseWithDeletions"] as const) {
    (adapters.github as any)[method] = async (owner: string, repo: string, files: any[], ...args: any[]) => {
      const session = context.getStore();
      if (!session) throw new Error("Sync upload requires an operation");
      const remote = await original.github.getRepoTree(owner, repo);
      if (!session.remoteHead || remote.commitSha !== session.remoteHead) throw new StaleSyncError();
      const hashes = new Map(remote.tree.filter((f: any) => f.type === "blob").map((f: any) => [f.path, f.sha]));
      const deletions = method === "pushCodebaseWithDeletions" ? args[0] as string[] : [];
      const steps: Step[] = [
        ...files.map((f) => ({ path: f.path, action: "upload" as const,
          before: (hashes.get(f.path) as string) ?? null,
          after: computeGitBlobSha(Buffer.from(f.content, f.encoding === "base64" ? "base64" : "utf8")),
          state: "uncertain" as const })),
        ...deletions.map((name) => ({ path: name, action: "upload" as const,
          before: (hashes.get(name) as string) ?? null, after: null, state: "uncertain" as const })),
      ];
      session.record.remote = { owner, repo, before: remote.commitSha };
      session.record.steps.push(...steps);
      save(session);
      const progress: import("./github").SyncUploadProgress = (event) => {
        if ("path" in event) {
          const step = steps.find((s) => s.path === event.path);
          if (step) step.state = event.state;
        } else {
          steps.forEach((s) => { s.state = event.state === "publishing" ? "uncertain" : "completed"; });
        }
        save(session);
      };
      const result = await (original.github[method] as Function)(owner, repo, files, ...args, progress, session.remoteHead);
      if (result.skippedFiles?.length) throw new Error(INCOMPLETE_SYNC);
      steps.forEach((s) => { s.state = "completed"; });
      save(session);
      return result;
    };
  }
  function wrap(operation: string, handler: RequestHandler): RequestHandler {
    return async (req, res, next) => {
      let previous: Record | null;
      const request = computeGitBlobSha(Buffer.from(JSON.stringify({
        operation, force: req.body?.force === true,
        ...(operation === "resolve-conflicts" ? {
          resolutions: Array.isArray(req.body) ? req.body : req.body?.resolutions,
          planId: req.body?.planId,
        } : {}),
      })));
      try {
        previous = read();
        if (previous && !previous.complete) {
          await verify(previous);
          if (operation === "pull" && req.body?.force !== true &&
              previous.operation === "resolve-conflicts" && !previous.remote) {
            // Earlier versions could write local resolutions then reject a
            // stale branch. No upload was started. Verified local before/after
            // bytes may be reconciled by an explicitly requested normal pull.
            // Retire only that intent, never advance its common ancestor.
            previous.complete = true;
            save({ record: previous, started: true });
            previous = null;
          } else if (previous.request !== request) {
            throw new Error("Retry the original sync action before starting another operation.");
          }
        }
      } catch (error) {
        res.status(500).json({ error: `${INCOMPLETE_SYNC} ${error instanceof Error ? error.message : String(error)}` });
        return;
      }
      const session: Session = { started: false, record: {
        version: 1, operation, request, checkpoint: checkpoint(), complete: false,
        ...(previous?.pendingFile !== undefined ? { pendingFile: previous.pendingFile } : {}),
        steps: previous && !previous.complete ? [...previous.steps] : [],
        ...(previous && !previous.complete && previous.remote ? { remote: previous.remote } : {}),
      } };
      // Buffer the route response until all intended writes and checkpoint
      // persistence finish. Existing successful response bytes remain unchanged.
      const json = res.json.bind(res);
      let body: any;
      res.json = ((value: any) => { body = value; return res; }) as typeof res.json;
      await context.run(session, async () => {
        try {
          let resumed = false;
          // A lost resolution-push response is not permission to repeat its
          // local writes or re-submit the now-stale pending plan.
          if (operation === "resolve-conflicts" && previous && !previous.complete && previous.remote) {
            const { owner, repo, before } = previous.remote;
            const remote = await original.github.getRepoTree(owner, repo);
            if (remote.commitSha !== before) {
              await verifyFinished(previous);
              const writes = req.body.resolutions.filter((r: any) => r.resolvedContent !== null).map((r: any) => r.path);
              const deletes = req.body.resolutions.filter((r: any) => r.resolvedContent === null).map((r: any) => r.path);
              const uploads = previous.steps.filter((s) => s.action === "upload");
              const deletedCount = uploads.filter((s) => s.after === null).length;
              const filesPushed = uploads.filter((s) => s.after !== null).length;
              session.checkpoint = remote.commitSha;
              session.clear = true;
              save(session);
              body = {
                message: `Resolved ${writes.length} conflict(s)${deletedCount > 0 ? `, deleted ${deletedCount} file(s)` : ""} and pushed ${filesPushed} files to ${owner}/${repo}`,
                commitSha: remote.commitSha, filesResolved: writes, filesDeleted: deletes,
                filesPushed, operation: "push",
              };
              resumed = true;
            }
          }
          if (!resumed) await handler(req, res, next);
          if (res.statusCode >= 400 && !body?.hasConflicts) {
            if (body?.staleHead && !session.started && !previous?.remote) {
              // Keep the actionable stale response. The explicit normal-pull
              // reconciliation path above handles any older local-only intent.
              // Stale rejection preserves the pending generation.
            } else if (session.started || (previous && !previous.complete)) {
              body = { error: INCOMPLETE_SYNC, outcomes: session.record.steps };
            }
          } else {
            if (previous && !previous.complete) await verifyFinished(previous);
            if ((session.clear || session.pending) && !session.started) save(session);
            const pendingFile = session.clear ? null : session.pending
              ? storePending(session.pending) : session.record.pendingFile;
            if (session.checkpoint !== undefined) original.checkpoint.setLastSyncedCommit(session.checkpoint);
            if (session.pending) original.conflicts.setPendingConflicts(session.pending);
            if (session.clear) original.conflicts.clearPendingConflicts();
            if (session.started || previous) {
              session.record.complete = true;
              if (session.checkpoint !== undefined) session.record.checkpoint = session.checkpoint;
              session.record.pendingFile = pendingFile;
              save(session);
            }
            try { cleanPendingGenerations(session.record.pendingFile); }
            catch { console.warn("Obsolete sync metadata cleanup failed; retained generations will be retried after the next successful sync."); }
          }
        } catch {
          res.status(500);
          body = { error: INCOMPLETE_SYNC, outcomes: session.record.steps };
        }
      });
      res.json = json;
      json(body);
    };
  }
  function localExpectations(expected: { [name: string]: string | null }) {
    const result = { ...expected };
    // Only a verified retry may accept bytes written by its own earlier attempt.
    for (const step of context.getStore()?.record.steps ?? []) {
      if (step.action !== "upload" && step.before === expected[step.path] &&
          localHash(step.path) === step.after) result[step.path] = step.after;
    }
    return result;
  }
  return { adapters, wrap, planLocal, assertHead, localExpectations,
    revision: () => computeGitBlobSha(Buffer.from(JSON.stringify(read() ?? {
      checkpoint: original.checkpoint.getLastSyncedCommit(),
    }))),
    result: () => {
    const r = read();
    return r && !r.complete ? { message: INCOMPLETE_SYNC, operation: r.operation,
      outcomes: r.steps.map(({ path, action, state }) => ({ path, action, state })) } : null;
  } };
}
