import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { githubRequest, getAuthenticatedUser, getRepository, createRepository, pushCodebase, pushCodebaseWithDeletions, getRepoTree, getRepoTreeAtCommit, getFileContent, getFileContentAtCommit } from "./github";
import { getLastSyncedCommit, setLastSyncedCommit } from "./sync-state";
import { detectPushConflicts, detectPullConflicts, type FileEntry } from "./conflict-detection";
import { getPendingConflicts, setPendingConflicts, clearPendingConflicts } from "./pending-conflicts";
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
      const content = await getFileContentAtCommit(OWNER, REPO, filePath, commitRef);
      if (content !== null) {
        files.push({ path: filePath, content });
      }
    } catch (err: any) {
      if (err.message?.includes("404")) {
        continue;
      }
      errors.push(`${filePath}: ${err.message}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Failed to fetch ${errors.length} file(s) from commit ${commitRef}: ${errors.slice(0, 5).join("; ")}`);
  }
  return files;
}

async function fetchRemoteFilesAtHead(treePaths: string[]): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  const errors: string[] = [];
  for (const filePath of treePaths) {
    try {
      const content = await getFileContent(OWNER, REPO, filePath);
      if (content !== null) {
        files.push({ path: filePath, content });
      }
    } catch (err: any) {
      if (err.message?.includes("404")) {
        continue;
      }
      errors.push(`${filePath}: ${err.message}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Failed to fetch ${errors.length} file(s) from remote HEAD: ${errors.slice(0, 5).join("; ")}`);
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
        clearPendingConflicts();
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

      let baseTree: any[];
      try {
        const baseData = await getRepoTreeAtCommit(OWNER, REPO, lastSyncedSha);
        baseTree = baseData.tree;
      } catch (err) {
        res.status(500).json({
          error: `Could not fetch base commit ${lastSyncedSha}. The sync state may be stale. Try a force pull with { "force": true } to re-sync.`,
        });
        return;
      }

      const basePaths: string[] = baseTree
        .filter((item: any) => item.type === "blob" && !shouldIgnorePath(item.path) && !isBinaryFile(item.path))
        .map((item: any) => item.path);

      const baseFiles = await fetchRemoteFiles(basePaths, lastSyncedSha);

      const allRelevantPaths = new Set([...eligiblePaths, ...basePaths]);

      const projectRoot = path.resolve(process.cwd());
      const localFiles: FileEntry[] = [];
      for (const filePath of allRelevantPaths) {
        const fullPath = path.join(projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.size <= MAX_FILE_SIZE) {
              const content = fs.readFileSync(fullPath, "utf-8");
              localFiles.push({ path: filePath, content });
            }
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
        clearPendingConflicts();
      } else {
        setPendingConflicts({
          operation: "pull",
          conflicts: report.conflicts,
          safeToUpdate: [],
          remoteHeadSha,
          createdAt: new Date().toISOString(),
        });
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
          localContent: c.localContent,
          remoteContent: c.remoteContent,
          baseContent: c.baseContent,
        })),
        hasConflicts: report.conflicts.length > 0,
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

        let baseFiles: FileEntry[];
        try {
          const baseTree = await getRepoTreeAtCommit(OWNER, REPO, lastSyncedSha);
          const basePaths = baseTree.tree
            .filter((item: any) => item.type === "blob" && !shouldIgnorePath(item.path) && !isBinaryFile(item.path))
            .map((item: any) => item.path)
            .filter((p: string) => unionPaths.has(p));
          baseFiles = await fetchRemoteFiles(basePaths, lastSyncedSha);
        } catch (err) {
          res.status(500).json({
            error: `Could not fetch base commit ${lastSyncedSha} for comparison. The sync state may be stale. Try a force push with { "force": true } to push without conflict checks, or force pull first to re-sync.`,
          });
          return;
        }

        const report = detectPushConflicts(localFiles, remoteFiles, baseFiles);

        if (report.conflicts.length > 0) {
          setPendingConflicts({
            operation: "push",
            conflicts: report.conflicts,
            safeToUpdate: report.safeToUpdate,
            remoteHeadSha,
            commitMessage,
            createdAt: new Date().toISOString(),
          });

          res.status(409).json({
            error: "Push blocked due to conflicts",
            message: `${report.conflicts.length} file(s) were modified both locally and remotely since last sync. Resolve conflicts before pushing.`,
            conflicts: report.conflicts.map((c) => ({
              path: c.path,
              reason: c.reason,
              localContent: c.localContent,
              remoteContent: c.remoteContent,
              baseContent: c.baseContent,
            })),
            hasConflicts: true,
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
          clearPendingConflicts();
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
        clearPendingConflicts();

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
      clearPendingConflicts();

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

  app.get("/api/github/conflicts", async (_req, res) => {
    try {
      const pending = getPendingConflicts();
      if (!pending) {
        res.json({ hasConflicts: false, conflicts: [], operation: null });
        return;
      }
      res.json({
        hasConflicts: true,
        operation: pending.operation,
        remoteHeadSha: pending.remoteHeadSha,
        commitMessage: pending.commitMessage || null,
        createdAt: pending.createdAt,
        conflicts: pending.conflicts.map((c) => ({
          path: c.path,
          reason: c.reason,
          localContent: c.localContent,
          remoteContent: c.remoteContent,
          baseContent: c.baseContent,
        })),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  interface ResolutionEntry {
    path: string;
    resolvedContent: string | null;
    operation?: string;
  }

  app.post("/api/github/resolve-conflicts", async (req, res) => {
    try {
      const rawBody = req.body;
      const resolutions: unknown[] = Array.isArray(rawBody) ? rawBody : rawBody?.resolutions;
      if (!resolutions || !Array.isArray(resolutions) || resolutions.length === 0) {
        res.status(400).json({ error: "resolutions array is required and must not be empty" });
        return;
      }

      const pending = getPendingConflicts();
      if (!pending) {
        res.status(400).json({ error: "No pending conflicts to resolve" });
        return;
      }

      const projectRoot = path.resolve(process.cwd());
      const pendingPaths = new Set(pending.conflicts.map((c) => c.path));
      const validatedResolutions: ResolutionEntry[] = [];
      for (const raw of resolutions) {
        const r = raw as Record<string, unknown>;
        if (!r.path || typeof r.path !== "string" || (r.resolvedContent !== null && typeof r.resolvedContent !== "string")) {
          res.status(400).json({ error: `Each resolution must have a "path" (string) and "resolvedContent" (string or null). Invalid entry for: ${(r.path as string) || "unknown"}` });
          return;
        }
        if (!pendingPaths.has(r.path as string)) {
          res.status(400).json({ error: `File "${r.path}" is not in the pending conflicts list` });
          return;
        }
        const resolvedFullPath = path.resolve(projectRoot, r.path as string);
        if (!resolvedFullPath.startsWith(projectRoot + path.sep)) {
          res.status(400).json({ error: `Invalid file path: "${r.path}" escapes project root` });
          return;
        }
        validatedResolutions.push({
          path: r.path as string,
          resolvedContent: r.resolvedContent as string | null,
        });
      }

      const resolvedPaths = new Set(validatedResolutions.map((r) => r.path));
      const unresolvedConflicts = pending.conflicts.filter((c) => !resolvedPaths.has(c.path));
      if (unresolvedConflicts.length > 0) {
        res.status(400).json({
          error: `All conflicts must be resolved. Missing resolutions for: ${unresolvedConflicts.map((c) => c.path).join(", ")}`,
        });
        return;
      }

      const writtenFiles: string[] = [];
      const deletedFiles: string[] = [];
      for (const r of validatedResolutions) {
        const fullPath = path.join(projectRoot, r.path);
        if (r.resolvedContent === null) {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
          deletedFiles.push(r.path);
        } else {
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, r.resolvedContent, "utf-8");
          writtenFiles.push(r.path);
        }
      }

      if (pending.operation === "push") {
        const branchRef = await githubRequest(`/repos/${OWNER}/${REPO}/git/ref/heads/main`);
        const currentRemoteHead = branchRef.object?.sha as string;
        if (currentRemoteHead && currentRemoteHead !== pending.remoteHeadSha) {
          clearPendingConflicts();
          res.status(409).json({
            error: "Remote branch has advanced since conflicts were detected. Please pull again to get the latest changes.",
            staleHead: true,
          });
          return;
        }

        const resolvedFileEntries: FileEntry[] = validatedResolutions
          .filter((r) => r.resolvedContent !== null)
          .map((r) => ({ path: r.path, content: r.resolvedContent as string }));
        const filesToPush = [...pending.safeToUpdate, ...resolvedFileEntries];
        const filesToDelete = validatedResolutions
          .filter((r) => r.resolvedContent === null)
          .map((r) => r.path);

        const commitMessage = pending.commitMessage || "Resolve conflicts and push from Replit";

        if (filesToPush.length === 0 && filesToDelete.length === 0) {
          setLastSyncedCommit(pending.remoteHeadSha);
          clearPendingConflicts();
          res.json({
            message: "All conflicts resolved — no changes to push.",
            commitSha: pending.remoteHeadSha,
            filesResolved: writtenFiles,
            filesDeleted: deletedFiles,
            filesPushed: 0,
            operation: "push",
          });
        } else {
          const result = await pushCodebaseWithDeletions(OWNER, REPO, filesToPush, filesToDelete, commitMessage);
          setLastSyncedCommit(result.commitSha);
          clearPendingConflicts();

          res.json({
            message: `Resolved ${writtenFiles.length} conflict(s)${filesToDelete.length > 0 ? `, deleted ${filesToDelete.length} file(s)` : ""} and pushed ${result.filesCount} files to ${OWNER}/${REPO}`,
            commitSha: result.commitSha,
            filesResolved: writtenFiles,
            filesDeleted: deletedFiles,
            filesPushed: result.filesCount,
            operation: "push",
          });
        }
      } else {
        setLastSyncedCommit(pending.remoteHeadSha);
        clearPendingConflicts();

        res.json({
          message: `Resolved ${writtenFiles.length} conflict(s)${deletedFiles.length > 0 ? `, deleted ${deletedFiles.length} file(s)` : ""}. Pull sync complete.`,
          commitSha: pending.remoteHeadSha,
          filesResolved: writtenFiles,
          filesDeleted: deletedFiles,
          operation: "pull",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  app.delete("/api/github/conflicts", async (_req, res) => {
    try {
      clearPendingConflicts();
      res.json({ message: "Pending conflicts cleared" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  return httpServer;
}
