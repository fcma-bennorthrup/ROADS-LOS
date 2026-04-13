import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAuthenticatedUser, getRepository, createRepository, pushCodebase, getRepoTree, getRepoTreeAtCommit, getFileContent, getFileContentAtCommit } from "./github";
import { getLastSyncedCommit, setLastSyncedCommit } from "./sync-state";
import { detectPushConflicts, detectPullConflicts, type FileEntry } from "./conflict-detection";
import * as fs from "fs";
import * as path from "path";

const OWNER = "bennorthrup";
const REPO = "ROADS-LOS";

const IGNORE_DIRS = new Set(["node_modules", ".git", ".cache", "dist", ".local", ".agents", "migrations", ".config", ".upm", "attached_assets"]);
const IGNORE_FILES = new Set(["package-lock.json"]);
const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".webm", ".zip", ".tar", ".gz"]);
const MAX_FILE_SIZE = 500 * 1024;

function shouldIgnorePath(filePath: string): boolean {
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  if (IGNORE_FILES.has(fileName)) return true;
  return parts.some((p: string) => IGNORE_DIRS.has(p) || p.startsWith("."));
}

function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

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
      if (IGNORE_FILES.has(entry.name)) continue;
      if (isBinaryFile(entry.name)) continue;
      try {
        const stats = fs.statSync(fullPath);
        if (stats.size > MAX_FILE_SIZE) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        results.push({ path: relativePath, content });
      } catch {}
    }
  }
  return results;
}

async function fetchRemoteFiles(treePaths: string[], commitRef: string): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  for (const filePath of treePaths) {
    try {
      const content = await getFileContentAtCommit(OWNER, REPO, filePath, commitRef);
      if (content !== null) {
        files.push({ path: filePath, content });
      }
    } catch {}
  }
  return files;
}

async function fetchRemoteFilesAtHead(treePaths: string[]): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  for (const filePath of treePaths) {
    try {
      const content = await getFileContent(OWNER, REPO, filePath);
      if (content !== null) {
        files.push({ path: filePath, content });
      }
    } catch {}
  }
  return files;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/github/user", async (_req, res) => {
    try {
      const user = await getAuthenticatedUser();
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/github/repo", async (_req, res) => {
    try {
      const user = await getAuthenticatedUser();
      const repo = await getRepository(user.login, "ROADS-LOS");
      res.json(repo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/github/repo", async (_req, res) => {
    try {
      const repo = await createRepository("ROADS-LOS", {
        description: "ROADS LOS - Living prototype of a Loan Origination System",
        isPrivate: false,
      });
      res.json(repo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/loans/:id", async (req, res) => {
    try {
      const loan = await storage.getLoan(req.params.id);
      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }
      const borrowers = await storage.getBorrowersByLoanId(req.params.id);
      res.json({ ...loan, borrowers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/github/sync-status", async (_req, res) => {
    try {
      const lastSynced = getLastSyncedCommit();
      const { commitSha: remoteHead } = await getRepoTree(OWNER, REPO);
      res.json({
        lastSyncedCommitSha: lastSynced,
        remoteHeadSha: remoteHead,
        inSync: lastSynced === remoteHead,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/github/pull", async (req, res) => {
    try {
      const force = req.body?.force === true;
      const { commitSha: remoteHeadSha, tree: remoteTree } = await getRepoTree(OWNER, REPO);
      const lastSyncedSha = getLastSyncedCommit();

      const eligiblePaths = remoteTree
        .filter((item: any) => item.type === "blob" && !shouldIgnorePath(item.path) && !isBinaryFile(item.path))
        .map((item: any) => item.path);

      if (!force && lastSyncedSha && lastSyncedSha === remoteHeadSha) {
        res.json({
          commitSha: remoteHeadSha,
          filesUpdated: 0,
          conflicts: [],
          message: "Already up to date — no new changes on remote since last sync.",
        });
        return;
      }

      if (force || !lastSyncedSha) {
        const projectRoot = path.resolve(process.cwd());
        let updatedCount = 0;

        for (const filePath of eligiblePaths) {
          try {
            const content = await getFileContent(OWNER, REPO, filePath);
            if (content !== null) {
              const fullPath = path.join(projectRoot, filePath);
              const dir = path.dirname(fullPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(fullPath, content, "utf-8");
              updatedCount++;
            }
          } catch (err) {
            console.error(`Failed to pull file ${filePath}:`, err);
          }
        }

        setLastSyncedCommit(remoteHeadSha);
        res.json({
          commitSha: remoteHeadSha,
          filesUpdated: updatedCount,
          conflicts: [],
          message: !lastSyncedSha
            ? `Initial sync: pulled ${updatedCount} files from ${OWNER}/${REPO}`
            : `Force pulled ${updatedCount} files from ${OWNER}/${REPO}`,
        });
        return;
      }

      const remoteFiles = await fetchRemoteFilesAtHead(eligiblePaths);

      let baseTree: any[] = [];
      try {
        const baseData = await getRepoTreeAtCommit(OWNER, REPO, lastSyncedSha);
        baseTree = baseData.tree;
      } catch (err) {
        console.warn(`Could not fetch base tree at ${lastSyncedSha}, treating all files as new:`, err);
      }

      const basePaths = baseTree
        .filter((item: any) => item.type === "blob" && !shouldIgnorePath(item.path) && !isBinaryFile(item.path))
        .map((item: any) => item.path);

      const baseFiles = await fetchRemoteFiles(basePaths, lastSyncedSha);

      const projectRoot = path.resolve(process.cwd());
      const localFiles: FileEntry[] = [];
      for (const filePath of eligiblePaths) {
        const fullPath = path.join(projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            localFiles.push({ path: filePath, content });
          } catch (err) {
            console.warn(`Could not read local file ${filePath}:`, err);
          }
        }
      }

      const report = detectPullConflicts(localFiles, remoteFiles, baseFiles);

      let updatedCount = 0;
      for (const file of report.safeToUpdate) {
        try {
          const fullPath = path.join(projectRoot, file.path);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, file.content, "utf-8");
          updatedCount++;
        } catch (err) {
          console.warn(`Failed to write pulled file ${file.path}:`, err);
        }
      }

      let deletedCount = 0;
      for (const filePath of report.safeToDelete) {
        try {
          const fullPath = path.join(projectRoot, filePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            deletedCount++;
          }
        } catch (err) {
          console.warn(`Failed to delete file ${filePath}:`, err);
        }
      }

      if (report.conflicts.length === 0) {
        setLastSyncedCommit(remoteHeadSha);
      }

      res.json({
        commitSha: remoteHeadSha,
        filesUpdated: updatedCount,
        filesDeleted: deletedCount,
        safeFiles: report.safeToUpdate.map((f) => f.path),
        deletedFiles: report.safeToDelete,
        unchangedFiles: report.unchanged,
        conflicts: report.conflicts.map((c) => ({
          path: c.path,
          reason: c.reason,
          localContentPreview: c.localContent?.substring(0, 500) ?? null,
          remoteContentPreview: c.remoteContent?.substring(0, 500) ?? null,
          baseContentPreview: c.baseContent?.substring(0, 500) ?? null,
        })),
        message: report.conflicts.length > 0
          ? `Pulled ${updatedCount} files, deleted ${deletedCount}. ${report.conflicts.length} file(s) have conflicts and were NOT overwritten. Resolve conflicts before syncing again.`
          : `Pulled ${updatedCount} files, deleted ${deletedCount} from ${OWNER}/${REPO}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/github/push", async (req, res) => {
    try {
      const commitMessage = req.body?.message || "Update codebase from Replit";
      const force = req.body?.force === true;

      const projectRoot = path.resolve(process.cwd());
      const localFiles = collectLocalFiles(projectRoot);

      const { commitSha: remoteHeadSha, tree: remoteTree } = await getRepoTree(OWNER, REPO);
      const lastSyncedSha = getLastSyncedCommit();

      if (!force && lastSyncedSha && lastSyncedSha !== remoteHeadSha) {
        const eligibleRemotePaths = remoteTree
          .filter((item: any) => item.type === "blob" && !shouldIgnorePath(item.path) && !isBinaryFile(item.path))
          .map((item: any) => item.path);

        const localPathSet = new Set(localFiles.map((f) => f.path));
        const remotePathSet = new Set(eligibleRemotePaths as string[]);
        const unionPaths = new Set([...localPathSet, ...remotePathSet]);

        const remoteFiles = await fetchRemoteFilesAtHead(eligibleRemotePaths);

        let baseFiles: FileEntry[] = [];
        try {
          const baseTree = await getRepoTreeAtCommit(OWNER, REPO, lastSyncedSha);
          const basePaths = baseTree.tree
            .filter((item: any) => item.type === "blob" && !shouldIgnorePath(item.path) && !isBinaryFile(item.path))
            .map((item: any) => item.path)
            .filter((p: string) => unionPaths.has(p));
          baseFiles = await fetchRemoteFiles(basePaths, lastSyncedSha);
        } catch (err) {
          console.warn(`Could not fetch base tree at ${lastSyncedSha} for push comparison, treating all remote files as new:`, err);
        }

        const report = detectPushConflicts(localFiles, remoteFiles, baseFiles);

        if (report.conflicts.length > 0) {
          res.status(409).json({
            error: "Push blocked due to conflicts",
            message: `${report.conflicts.length} file(s) were modified both locally and remotely since last sync. Pull first to resolve conflicts before pushing.`,
            conflicts: report.conflicts.map((c) => ({
              path: c.path,
              reason: c.reason,
              localContentPreview: c.localContent?.substring(0, 500) ?? null,
              remoteContentPreview: c.remoteContent?.substring(0, 500) ?? null,
              baseContentPreview: c.baseContent?.substring(0, 500) ?? null,
            })),
            safeFiles: report.safeToUpdate.map((f) => f.path),
            unchangedFiles: report.unchanged,
            safeFileCount: report.safeToUpdate.length,
            conflictFileCount: report.conflicts.length,
          });
          return;
        }

        const filesToPush = report.safeToUpdate;
        if (filesToPush.length === 0) {
          setLastSyncedCommit(remoteHeadSha);
          res.json({
            commitSha: remoteHeadSha,
            filesCount: 0,
            conflicts: [],
            safeFiles: [],
            unchangedFiles: report.unchanged,
            message: "No local changes to push — all files are unchanged since last sync.",
          });
          return;
        }

        const result = await pushCodebase(OWNER, REPO, filesToPush, commitMessage);
        setLastSyncedCommit(result.commitSha);

        res.json({
          ...result,
          conflicts: [],
          safeFiles: filesToPush.map((f) => f.path),
          unchangedFiles: report.unchanged,
          message: `Successfully pushed ${result.filesCount} locally-changed files to ${OWNER}/${REPO} (${report.unchanged.length} unchanged files preserved on remote)`,
        });
        return;
      }

      const result = await pushCodebase(OWNER, REPO, localFiles, commitMessage);
      setLastSyncedCommit(result.commitSha);

      res.json({
        ...result,
        conflicts: [],
        safeFiles: localFiles.map((f) => f.path),
        unchangedFiles: [],
        message: `Successfully pushed ${result.filesCount} files to ${OWNER}/${REPO}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
