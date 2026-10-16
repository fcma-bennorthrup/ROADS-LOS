import type * as filesystem from "fs";
import * as path from "path";
import type { FileEntry } from "./conflict-detection";
import { isCredentialOrRuntimePath } from "./sync-file-policy";
import { planTreeDiff } from "./sync-plan";

export type SyncFilesystem = Pick<typeof filesystem, "readdirSync" | "lstatSync" | "statSync" | "readFileSync" | "existsSync" | "mkdirSync" | "writeFileSync" | "unlinkSync" | "renameSync">;
type ContentTransport = Pick<typeof import("./github"), "getFileContent" | "getFileContentAtCommit">;

const IGNORE_DIRS = new Set(["node_modules", ".git", ".cache", "dist", ".local", ".agents", "migrations", ".config", ".upm"]);
const IGNORE_FILES = new Set(["package-lock.json"]);
const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".webm", ".zip", ".tar", ".gz"]);
export const MAX_FILE_SIZE = 7 * 1024 * 1024;

export function shouldIgnorePath(filePath: string): boolean {
  if (isCredentialOrRuntimePath(filePath)) return true;
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  if (IGNORE_FILES.has(fileName)) return true;
  const dirParts = parts.slice(0, -1);
  return dirParts.some((p: string) => IGNORE_DIRS.has(p) || p.startsWith("."));
}

export function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export function createSyncMechanics(fs: SyncFilesystem, transport: ContentTransport, owner: string, repo: string) {
  function collectLocalFiles(dir: string, base: string = ""): FileEntry[] {
    const results: FileEntry[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          results.push(...collectLocalFiles(fullPath, relativePath));
        }
      } else if (entry.isFile()) {
        if (IGNORE_FILES.has(entry.name) || isCredentialOrRuntimePath(relativePath)) continue;
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > MAX_FILE_SIZE) continue;
          if (isBinaryFile(entry.name)) {
            const content = fs.readFileSync(fullPath).toString("base64");
            results.push({ path: relativePath, content, encoding: "base64" });
          } else {
            const content = fs.readFileSync(fullPath, "utf-8");
            results.push({ path: relativePath, content });
          }
        } catch {}
      }
    }
    return results;
  }

  async function fetchRemoteFiles(treePaths: string[], commitRef: string): Promise<FileEntry[]> {
    const files: FileEntry[] = [];
    const errors: string[] = [];
    for (const filePath of treePaths) {
      try {
        const content = await transport.getFileContentAtCommit(owner, repo, filePath, commitRef);
        if (content !== null) files.push({ path: filePath, content });
      } catch (err: any) {
        if (err.message?.includes("404")) continue;
        errors.push(`${filePath}: ${err.message}`);
      }
    }
    if (errors.length > 0) {
      throw new Error(`Failed to fetch ${errors.length} file(s) from commit ${commitRef}: ${errors.slice(0, 5).join("; ")}`);
    }
    return files;
  }

  function diffAgainstRemoteTree(
    localFiles: FileEntry[],
    remoteTree: { path: string; type: string; sha: string }[],
    projectRoot?: string,
  ): { changedFiles: FileEntry[]; deletions: string[] } {
    const { changedFiles, deletionCandidates } = planTreeDiff(
      localFiles,
      remoteTree.filter((item) => item.type === "blob" && !shouldIgnorePath(item.path)),
    );
    const deletions: string[] = [];
    if (projectRoot) {
      for (const remotePath of deletionCandidates) {
        const fullPath = path.join(projectRoot, remotePath);
        if (isBinaryFile(remotePath)) continue;
        try {
          fs.statSync(fullPath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") deletions.push(remotePath);
          else throw error;
        }
      }
    }
    return { changedFiles, deletions };
  }

  async function fetchRemoteFilesAtHead(treePaths: string[]): Promise<FileEntry[]> {
    const files: FileEntry[] = [];
    const errors: string[] = [];
    for (const filePath of treePaths) {
      try {
        const content = await transport.getFileContent(owner, repo, filePath);
        if (content !== null) files.push({ path: filePath, content });
      } catch (err: any) {
        if (err.message?.includes("404")) continue;
        errors.push(`${filePath}: ${err.message}`);
      }
    }
    if (errors.length > 0) {
      throw new Error(`Failed to fetch ${errors.length} file(s) from remote HEAD: ${errors.slice(0, 5).join("; ")}`);
    }
    return files;
  }

  return { collectLocalFiles, fetchRemoteFiles, diffAgainstRemoteTree, fetchRemoteFilesAtHead };
}
