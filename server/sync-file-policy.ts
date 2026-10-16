import * as path from "path";

const EXCLUDED_NAMES = new Set([
  ".env",
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
  "github-sync-state.json",
  "pending-conflicts.json",
]);

// Filename-only policy: never inspect file contents to decide eligibility.
// Match case-sensitively, like the existing Linux sync path rules.
export function isCredentialOrRuntimePath(filePath: string): boolean {
  const name = path.posix.basename(path.posix.normalize(filePath));
  return EXCLUDED_NAMES.has(name)
    || name.startsWith(".env.")
    || name.endsWith(".pem")
    || name.endsWith(".key");
}

export const BLOCKED_SYNC_CONFLICT_MESSAGE =
  "Pending conflicts contain files excluded by the sync security policy. Cancel these conflicts, then retry the sync.";

export function hasExcludedPendingPaths(pending: {
  conflicts: { path: string }[];
  safeToUpdate: { path: string }[];
  safeToDelete?: string[];
}): boolean {
  return pending.conflicts.some((file) => isCredentialOrRuntimePath(file.path))
    || pending.safeToUpdate.some((file) => isCredentialOrRuntimePath(file.path))
    || (pending.safeToDelete ?? []).some(isCredentialOrRuntimePath);
}
