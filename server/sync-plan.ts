import * as crypto from "crypto";
import type { FileEntry } from "./conflict-detection";

export function computeGitBlobSha(content: Buffer): string {
  const header = `blob ${content.length}\0`;
  const store = Buffer.concat([Buffer.from(header), content]);
  return crypto.createHash("sha1").update(store).digest("hex");
}

// The caller supplies the already-eligible tree. Missing collected files are
// only deletion candidates: the filesystem check remains a separate step.
export function planTreeDiff(
  localFiles: FileEntry[],
  remoteBlobs: { path: string; sha: string }[],
): { changedFiles: FileEntry[]; deletionCandidates: string[] } {
  const remoteBlobMap = new Map<string, string>();
  for (const item of remoteBlobs) remoteBlobMap.set(item.path, item.sha);
  const localPathSet = new Set<string>();
  const changedFiles: FileEntry[] = [];
  for (const file of localFiles) {
    localPathSet.add(file.path);
    const remoteSha = remoteBlobMap.get(file.path);
    const contentBuffer = file.encoding === "base64"
      ? Buffer.from(file.content, "base64")
      : Buffer.from(file.content);
    const localSha = computeGitBlobSha(contentBuffer);
    if (remoteSha !== localSha) changedFiles.push(file);
  }
  const deletionCandidates: string[] = [];
  for (const [remotePath] of remoteBlobMap) {
    if (!localPathSet.has(remotePath)) deletionCandidates.push(remotePath);
  }
  return { changedFiles, deletionCandidates };
}
