import { computeGitBlobSha } from "./sync-plan";
import { readLocalFile } from "./sync-eligibility";
import type { SyncFilesystem } from "./sync-mechanics";
import type { PendingConflicts } from "./pending-conflicts";

export const STALE_SYNC = "Sync state has changed since this plan was created. No files were changed. Run sync again before resolving conflicts.";
export class StaleSyncError extends Error {
  constructor() { super(STALE_SYNC); }
}
export function pendingPlanId(pending: PendingConflicts): string {
  return computeGitBlobSha(Buffer.from(JSON.stringify(pending)));
}
export function snapshotHashes(hashes: Record<string, string | null>, names: string[]) {
  return Object.fromEntries(Array.from(new Set(names)).sort().map((name) => {
    if (!Object.hasOwn(hashes, name)) throw new StaleSyncError();
    return [name, hashes[name]];
  }));
}
export function captureLocalHashes(fs: SyncFilesystem, root: string, names: string[]) {
  return Object.fromEntries(Array.from(new Set(names)).sort().map((name) => {
    const entry = readLocalFile(fs, root, name);
    if (entry.state === "absent") return [name, null];
    if (entry.state !== "eligible") throw new StaleSyncError();
    if (!entry.rawSha) throw new StaleSyncError();
    return [name, entry.rawSha];
  }));
}
export function assertLocalHashes(fs: SyncFilesystem, root: string, expected: Record<string, string | null>) {
  const actual = captureLocalHashes(fs, root, Object.keys(expected));
  if (Object.keys(expected).some((name) => actual[name] !== expected[name])) throw new StaleSyncError();
}
