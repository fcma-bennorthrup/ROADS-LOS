import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { githubRequest, getAuthenticatedUser, getRepository, createRepository, pushCodebase, pushCodebaseWithDeletions, getRepoTree, getRepoTreeAtCommit, getFileContent, getFileContentAtCommit } from "./github";
import { getLastSyncedCommit, setLastSyncedCommit } from "./sync-state";
import { detectPushConflicts, detectPullConflicts, type FileEntry } from "./conflict-detection";
import { getPendingConflicts, setPendingConflicts, clearPendingConflicts } from "./pending-conflicts";
import { hasExcludedPendingPaths, BLOCKED_SYNC_CONFLICT_MESSAGE } from "./sync-file-policy";
import * as fs from "fs";
import * as path from "path";
import { computeGitBlobSha } from "./sync-plan";
import { createSyncMechanics, shouldIgnorePath, isBinaryFile, type SyncFilesystem } from "./sync-mechanics";
import { prepareEligibility, assertBinarySafety, EligibilityError, oversizedMessage, incompatiblePendingPlan, BLOCKED_ELIGIBILITY_PLAN, readLocalFile } from "./sync-eligibility";
import { createSyncRecovery } from "./sync-recovery";
import { createSyncCoordinator } from "./sync-coordination";
import { snapshotHashes, assertLocalHashes, pendingPlanId, StaleSyncError } from "./sync-snapshot";

export interface SyncRouteAdapters {
  filesystem: SyncFilesystem;
  github: Pick<typeof import("./github"), "githubRequest" | "getAuthenticatedUser" | "getRepository" | "createRepository" | "pushCodebase" | "pushCodebaseWithDeletions" | "getRepoTree" | "getRepoTreeAtCommit" | "getFileContent" | "getFileContentAtCommit">;
  checkpoint: Pick<typeof import("./sync-state"), "getLastSyncedCommit" | "setLastSyncedCommit">;
  conflicts: Pick<typeof import("./pending-conflicts"), "getPendingConflicts" | "setPendingConflicts" | "clearPendingConflicts">;
  cwd: () => string;
  clock: typeof Date;
}

// One registrar owns its helper adapters; each registration still owns its
// original status cache. No defaults are silently substituted for test adapters.
export function createSyncRouteRegistrar(adapters: SyncRouteAdapters) {
const coordinator = createSyncCoordinator(path.resolve(adapters.cwd()));
const recovery = createSyncRecovery(adapters);
adapters = recovery.adapters;
const fs = adapters.filesystem;
const { githubRequest, getAuthenticatedUser, getRepository, createRepository, pushCodebase, pushCodebaseWithDeletions, getRepoTree, getRepoTreeAtCommit, getFileContent, getFileContentAtCommit } = adapters.github;
const { getLastSyncedCommit, setLastSyncedCommit } = adapters.checkpoint;
const { getPendingConflicts, setPendingConflicts, clearPendingConflicts } = adapters.conflicts;
const process = { cwd: adapters.cwd };
const Date = adapters.clock;

const OWNER = "fcma-bennorthrup";
const REPO = "ROADS-LOS";

const { diffAgainstRemoteTree } =
  createSyncMechanics(fs, adapters.github, OWNER, REPO);

function pendingEligibilityBlocked(pending: NonNullable<ReturnType<typeof getPendingConflicts>>) {
  if (incompatiblePendingPlan(pending)) return true;
  const names = new Set([...pending.conflicts, ...pending.safeToUpdate,
    ...(pending.safeToDelete ?? []).map((name) => ({ path: name }))].map((f) => f.path));
  const outcomes = Array.from(names).map((name) => readLocalFile(fs, path.resolve(process.cwd()), name));
  const failed = outcomes.filter((item) => item.state === "failed-read");
  if (failed.length) throw new EligibilityError(failed);
  return outcomes.some((item) => item.state === "oversized" || item.state === "excluded");
}

async function registerRoutes(
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
      const repo = await getRepository(OWNER, REPO);
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

  let syncStatusCache: { data: any; timestamp: number; revision: string } | null = null;
  const SYNC_STATUS_CACHE_TTL = 5000;

  app.get("/api/github/sync-status", coordinator.wrap(async (_req, res) => {
    try {
      const now = Date.now();
      const revision = recovery.revision();
      if (syncStatusCache && syncStatusCache.revision === revision &&
          (now - syncStatusCache.timestamp) < SYNC_STATUS_CACHE_TTL && !recovery.result()) {
        return res.json(syncStatusCache.data);
      }

      const lastSynced = getLastSyncedCommit();
      const { commitSha: remoteHead } = await getRepoTree(OWNER, REPO);
      const remoteHasChanges = lastSynced !== remoteHead;

      let hasLocalChanges = false;
      let localChangedCount = 0;
      let localDeletedCount = 0;
      let localCheckFailed = false;

      if (lastSynced) {
        try {
          const { tree: baseTree } = await getRepoTreeAtCommit(OWNER, REPO, lastSynced);
          const projectRoot = path.resolve(process.cwd());
          const snapshot = await prepareEligibility(fs, adapters.github, projectRoot, OWNER, REPO, [], baseTree, lastSynced);
          const { changedFiles, deletions } = diffAgainstRemoteTree(snapshot.local,
            baseTree.filter((item: any) => !snapshot.skipped.includes(item.path) && !snapshot.excluded.includes(item.path)), projectRoot);
          localChangedCount = changedFiles.length;
          localDeletedCount = deletions.length;
          hasLocalChanges = localChangedCount > 0 || localDeletedCount > 0;
        } catch {
          localCheckFailed = true;
        }
      }

      const incomplete = recovery.result();
      const result = {
        lastSyncedCommitSha: lastSynced,
        remoteHeadSha: remoteHead,
        inSync: !remoteHasChanges && !hasLocalChanges && !localCheckFailed && !incomplete,
        remoteHasChanges,
        hasLocalChanges,
        localChangedCount,
        localDeletedCount,
        localCheckFailed,
        ...(incomplete ? { recovery: incomplete } : {}),
      };

      syncStatusCache = { data: result, timestamp: now, revision };
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }));

   app.post("/api/github/pull", coordinator.wrap(recovery.wrap("pull", async (req, res) => {
    try {
      syncStatusCache = null;
      const force = req.body?.force === true;
      const { commitSha: remoteHeadSha, tree: remoteTree } = await getRepoTree(OWNER, REPO);
      const lastSyncedSha = getLastSyncedCommit();
      const projectRoot = path.resolve(process.cwd());
      let baseTree: any[] = [];
      let usableBase = false;
      if (lastSyncedSha) {
        try {
          baseTree = (await getRepoTreeAtCommit(OWNER, REPO, lastSyncedSha)).tree;
          usableBase = true;
        } catch {
          if (!force && lastSyncedSha !== remoteHeadSha) {
            res.status(500).json({
              error: `Could not fetch base commit ${lastSyncedSha}. The sync state may be stale. Try a force pull with { "force": true } to re-sync.`,
            });
            return;
          }
        }
      }
      const snapshot = await prepareEligibility(fs, adapters.github, projectRoot, OWNER, REPO,
        remoteTree, baseTree, usableBase ? lastSyncedSha! : undefined, remoteHeadSha);
      assertBinarySafety(snapshot, usableBase);
      await recovery.assertHead(OWNER, REPO, remoteHeadSha);
      assertLocalHashes(fs, projectRoot, snapshotHashes(snapshot.localHashes,
        [...snapshot.local, ...snapshot.remote, ...snapshot.base].map((f) => f.path)));
      const suffix = oversizedMessage(snapshot.skipped.length);

      if (!force && lastSyncedSha && lastSyncedSha === remoteHeadSha) {
        res.json({
          commitSha: remoteHeadSha,
          filesUpdated: 0,
          conflicts: [],
          message: "Already up to date — no new changes on remote since last sync." + suffix,
        });
        return;
      }

      if (force || !lastSyncedSha) {
        let updatedCount = 0;
        recovery.planLocal(snapshot.remote);

        for (const file of snapshot.remote) {
          const filePath = file.path;
          try {
            {
              const fullPath = path.join(projectRoot, filePath);
              const dir = path.dirname(fullPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(fullPath, file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content, "utf-8");
              updatedCount++;
            }
          } catch (err) {
            console.error(`Failed to pull file ${filePath}:`, err);
            throw err;
          }
        }

        setLastSyncedCommit(remoteHeadSha);
        clearPendingConflicts();
        res.json({
          commitSha: remoteHeadSha,
          filesUpdated: updatedCount,
          conflicts: [],
          message: !lastSyncedSha
              ? `Initial sync: pulled ${updatedCount} files from ${OWNER}/${REPO}${suffix}`
              : `Force pulled ${updatedCount} files from ${OWNER}/${REPO}${suffix}`,
        });
        return;
      }

      // Preserve the pull's existing scope: local-only text is not a conflict.
      const relevant = new Set([...snapshot.remote, ...snapshot.base].map((f) => f.path));
      const report = detectPullConflicts(snapshot.local.filter((f) => relevant.has(f.path)), snapshot.remote, snapshot.base);
      report.safeToDelete = report.safeToDelete.filter((name) => !isBinaryFile(name));

      let updatedCount = 0;
      recovery.planLocal([
        ...report.safeToUpdate,
        ...report.safeToDelete.map((name) => ({ path: name, content: null })),
      ]);
      for (const file of report.safeToUpdate) {
        try {
          const fullPath = path.join(projectRoot, file.path);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content, "utf-8");
          updatedCount++;
        } catch (err) {
          console.warn(`Failed to write pulled file ${file.path}:`, err);
          throw err;
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
          throw err;
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
          localHashes: snapshotHashes(snapshot.localHashes, report.conflicts.map((f) => f.path)),
          createdAt: new Date().toISOString(),
        });
      }

      res.json({
        commitSha: remoteHeadSha,
        ...(report.conflicts.length ? { planId: pendingPlanId(getPendingConflicts()!) } : {}),
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
          ? `Pulled ${updatedCount} files, deleted ${deletedCount}. ${report.conflicts.length} file(s) have conflicts and were NOT overwritten. Resolve conflicts before syncing again.${suffix}`
          : `Pulled ${updatedCount} files, deleted ${deletedCount} from ${OWNER}/${REPO}${suffix}`,
      });
    } catch (error: any) {
      res.status(error instanceof StaleSyncError ? 409 : 500).json({ error: error.message });
    }
  })));

  app.post("/api/github/push", coordinator.wrap(recovery.wrap("push", async (req, res) => {
    try {
      syncStatusCache = null;
      const commitMessage = req.body?.message || "Update codebase from Replit";
      const force = req.body?.force === true;

      const projectRoot = path.resolve(process.cwd());
      const { commitSha: remoteHeadSha, tree: remoteTree } = await getRepoTree(OWNER, REPO);
      const lastSyncedSha = getLastSyncedCommit();
      let baseTreeData: { tree: any[] } = { tree: [] };
      let usableBase = false;
      if (lastSyncedSha) {
        try {
          baseTreeData = await getRepoTreeAtCommit(OWNER, REPO, lastSyncedSha);
          usableBase = true;
        } catch {
          if (!force && lastSyncedSha !== remoteHeadSha) {
            res.status(500).json({
              error: `Could not fetch base commit ${lastSyncedSha} for comparison. The sync state may be stale. Try a force push with { "force": true } to push without conflict checks, or force pull first to re-sync.`,
            });
            return;
          }
        }
      }
      const snapshot = await prepareEligibility(fs, adapters.github, projectRoot, OWNER, REPO,
        remoteTree, baseTreeData.tree, usableBase ? lastSyncedSha! : undefined, remoteHeadSha);
      assertBinarySafety(snapshot, usableBase);
      await recovery.assertHead(OWNER, REPO, remoteHeadSha);
      assertLocalHashes(fs, projectRoot, snapshotHashes(snapshot.localHashes,
        [...snapshot.local, ...snapshot.remote, ...snapshot.base].map((f) => f.path)));
      const localFiles = snapshot.local;
      const eligibleRemoteTree = remoteTree.filter((item: any) => !snapshot.skipped.includes(item.path) && !snapshot.excluded.includes(item.path));
      const suffix = oversizedMessage(snapshot.skipped.length);

      if (!force && lastSyncedSha && lastSyncedSha !== remoteHeadSha) {
        const localPathSet = new Set(localFiles.map((f) => f.path));
        const remotePathSet = new Set(snapshot.remote.map((f) => f.path));
        const unionPaths = new Set([...localPathSet, ...remotePathSet]);

        const remoteFiles = snapshot.remote;
        const baseFiles = snapshot.base.filter((f) => unionPaths.has(f.path));

        const report = detectPushConflicts(localFiles, remoteFiles, baseFiles);
        report.safeToDelete = report.safeToDelete.filter((name) => !isBinaryFile(name));

        if (report.conflicts.length > 0) {
          setPendingConflicts({
            operation: "push",
            conflicts: report.conflicts,
            safeToUpdate: report.safeToUpdate,
            safeToDelete: report.safeToDelete,
            remoteHeadSha,
            localHashes: snapshotHashes(snapshot.localHashes, [
              ...report.conflicts.map((f) => f.path), ...report.safeToUpdate.map((f) => f.path), ...report.safeToDelete,
            ]),
            commitMessage,
            createdAt: new Date().toISOString(),
          });

          res.status(409).json({
            error: "Push blocked due to conflicts",
            planId: pendingPlanId(getPendingConflicts()!),
            message: `${report.conflicts.length} file(s) were modified both locally and remotely since last sync. Resolve conflicts before pushing.${suffix}`,
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

        const safeDeletions = report.safeToDelete;
        const { changedFiles: filteredFiles } = diffAgainstRemoteTree(report.safeToUpdate, eligibleRemoteTree);
        const dedupedDeletions = [...new Set(safeDeletions)];

        if (filteredFiles.length === 0 && dedupedDeletions.length === 0) {
          setLastSyncedCommit(remoteHeadSha);
          clearPendingConflicts();
          res.json({
            commitSha: remoteHeadSha,
            filesCount: 0,
            conflicts: [],
            safeFiles: [],
            unchangedFiles: report.unchanged,
            message: "No local changes to push — all files are unchanged since last sync." + suffix,
          });
          return;
        }

        const result = await pushCodebaseWithDeletions(OWNER, REPO, filteredFiles, dedupedDeletions, commitMessage);
        setLastSyncedCommit(result.commitSha);
        clearPendingConflicts();

        res.json({
          ...result,
          conflicts: [],
          safeFiles: filteredFiles.map((f) => f.path),
          deletedFiles: dedupedDeletions,
          unchangedFiles: report.unchanged,
          message: `Successfully pushed ${result.filesCount} locally-changed file(s)${dedupedDeletions.length > 0 ? ` and deleted ${dedupedDeletions.length} file(s)` : ""} to ${OWNER}/${REPO} (${report.unchanged.length} unchanged files preserved on remote)${result.skippedFiles && result.skippedFiles.length > 0 ? `. Skipped ${result.skippedFiles.length} oversized file(s): ${result.skippedFiles.map((s: any) => s.path).join(", ")}` : ""}${suffix}`,
        });
        return;
      }

      let filesToDiff = localFiles;

      if (!force && lastSyncedSha && usableBase) {
        try {
          const baseTreeForFallback = baseTreeData;
          const baseShaMap = new Map<string, string>();
          for (const item of baseTreeForFallback.tree) {
            if (item.type === "blob" && !shouldIgnorePath(item.path)) {
              baseShaMap.set(item.path, item.sha);
            }
          }
          filesToDiff = localFiles.filter((f) => {
            const baseSha = baseShaMap.get(f.path);
            if (!baseSha) return true;
            const contentBuffer = f.encoding === "base64"
              ? Buffer.from(f.content, "base64")
              : Buffer.from(f.content);
            const localSha = computeGitBlobSha(contentBuffer);
            return localSha !== baseSha;
          });
        } catch (baseErr: any) {
          console.warn("Base tree fetch failed, diffing against remote only:", baseErr?.message);
        }
      }

      const canDetectDeletions = force || lastSyncedSha === remoteHeadSha;
      const { changedFiles, deletions } = diffAgainstRemoteTree(
        filesToDiff,
        eligibleRemoteTree,
        canDetectDeletions ? projectRoot : undefined
      );

      if (changedFiles.length === 0 && deletions.length === 0) {
        setLastSyncedCommit(remoteHeadSha);
        clearPendingConflicts();
        res.json({
          commitSha: remoteHeadSha,
          filesCount: 0,
          conflicts: [],
          safeFiles: [],
          unchangedFiles: localFiles.map((f) => f.path),
          message: "No local changes to push — all files match the remote." + suffix,
        });
        return;
      }

      const result = await pushCodebaseWithDeletions(OWNER, REPO, changedFiles, deletions, commitMessage);
      setLastSyncedCommit(result.commitSha);
      clearPendingConflicts();

      res.json({
        ...result,
        conflicts: [],
        safeFiles: changedFiles.map((f) => f.path),
        deletedFiles: deletions,
        unchangedFiles: [],
        message: `Successfully pushed ${result.filesCount} changed file(s)${deletions.length > 0 ? ` and deleted ${deletions.length} file(s)` : ""} to ${OWNER}/${REPO} (${localFiles.length - changedFiles.length} unchanged files preserved on remote)${result.skippedFiles && result.skippedFiles.length > 0 ? `. Skipped ${result.skippedFiles.length} oversized file(s): ${result.skippedFiles.map((s: any) => s.path).join(", ")}` : ""}${suffix}`,
      });
    } catch (error: any) {
      res.status(error instanceof StaleSyncError ? 409 : 500).json({ error: error.message });
    }
  })));

  app.get("/api/github/conflicts", coordinator.wrap(async (_req, res) => {
    try {
      const pending = getPendingConflicts();
      if (!pending) {
        res.json({ hasConflicts: false, conflicts: [], operation: null });
        return;
      }
      if (hasExcludedPendingPaths(pending)) {
        res.json({
          hasConflicts: true,
          conflicts: [],
          operation: pending.operation,
          blockedReason: BLOCKED_SYNC_CONFLICT_MESSAGE,
        });
        return;
      }
      if (pendingEligibilityBlocked(pending)) {
        res.json({
          hasConflicts: true, conflicts: [], operation: pending.operation,
          blockedReason: BLOCKED_ELIGIBILITY_PLAN,
        });
        return;
      }
      res.json({
        hasConflicts: true,
        operation: pending.operation,
        planId: pendingPlanId(pending),
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
  }));

  interface ResolutionEntry {
    path: string;
    resolvedContent: string | null;
    operation?: string;
  }

  app.post("/api/github/resolve-conflicts", coordinator.wrap(recovery.wrap("resolve-conflicts", async (req, res) => {
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
      if (hasExcludedPendingPaths(pending)) {
        res.status(409).json({ error: BLOCKED_SYNC_CONFLICT_MESSAGE });
        return;
      }
      if (pendingEligibilityBlocked(pending)) {
        res.status(409).json({ error: BLOCKED_ELIGIBILITY_PLAN });
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
      if (rawBody?.planId !== pendingPlanId(pending)) throw new StaleSyncError();
      const expectedLocal = pending.localHashes;
      // Old plans have no complete local snapshot (including safe updates and
      // deletions); never infer it from current files and bless stale work.
      if (!expectedLocal) throw new StaleSyncError();
      const expectedNames = [...pending.conflicts, ...pending.safeToUpdate,
        ...(pending.safeToDelete ?? []).map((name) => ({ path: name }))].map((f) => f.path);
      if (expectedNames.some((name) => !Object.hasOwn(expectedLocal, name))) throw new StaleSyncError();
      assertLocalHashes(fs, projectRoot, recovery.localExpectations(expectedLocal));

      // Recheck eligibility before applying an older plan. This does not move
      // the existing stale-HEAD check or change write-failure recovery.
      const currentTree = await getRepoTree(OWNER, REPO);
      const savedBinaries = pending.safeToUpdate.filter((f) => isBinaryFile(f.path));
      let resolutionBase: any[] = [];
      let resolutionBaseRef: string | undefined;
      if (savedBinaries.length) {
        const last = getLastSyncedCommit();
        if (last) {
          try {
            resolutionBase = (await getRepoTreeAtCommit(OWNER, REPO, last)).tree;
            resolutionBaseRef = last;
          } catch { /* No usable baseline: require identical existing binaries. */ }
        }
      }
      const pendingSnapshot = await prepareEligibility(fs, adapters.github, projectRoot, OWNER, REPO,
        currentTree.tree, resolutionBase, resolutionBaseRef, currentTree.commitSha);
      const plannedNames = new Set([...pending.conflicts, ...pending.safeToUpdate,
        ...(pending.safeToDelete ?? []).map((name) => ({ path: name }))].map((f) => f.path));
      if ([...pendingSnapshot.skipped, ...pendingSnapshot.excluded].some((name) => plannedNames.has(name))
        || incompatiblePendingPlan({ conflicts: [], safeToUpdate: validatedResolutions
          .filter((r) => r.resolvedContent !== null)
          .map((r) => ({ path: r.path, content: r.resolvedContent! })) })) {
        res.status(409).json({ error: BLOCKED_ELIGIBILITY_PLAN });
        return;
      }
      // Binary updates saved alongside text conflicts must not bypass the
      // safety rule. Without a usable baseline, differing copies are blocked.
      if (savedBinaries.length) {
        assertBinarySafety({ ...pendingSnapshot, local: savedBinaries,
          remote: pendingSnapshot.remote.filter((f) => savedBinaries.some((saved) => saved.path === f.path)),
          base: pendingSnapshot.base.filter((f) => savedBinaries.some((saved) => saved.path === f.path)),
        }, !!resolutionBaseRef);
      }

      if (currentTree.commitSha !== pending.remoteHeadSha) throw new StaleSyncError();
      await recovery.assertHead(OWNER, REPO, pending.remoteHeadSha);
      assertLocalHashes(fs, projectRoot, recovery.localExpectations(expectedLocal));

      const writtenFiles: string[] = [];
      const deletedFiles: string[] = [];
      recovery.planLocal(validatedResolutions.map((r) => ({ path: r.path, content: r.resolvedContent })));
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
        const resolvedFileEntries: FileEntry[] = validatedResolutions
          .filter((r) => r.resolvedContent !== null)
          .map((r) => ({ path: r.path, content: r.resolvedContent as string }));
        const filesToPush = [...pending.safeToUpdate, ...resolvedFileEntries];
        const conflictDeletions = validatedResolutions
          .filter((r) => r.resolvedContent === null)
          .map((r) => r.path);
        const pendingSafeDeletions = pending.safeToDelete || [];
        const filesToDelete = [...conflictDeletions, ...pendingSafeDeletions];

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
      res.status(error instanceof StaleSyncError ? 409 : 500).json({ error: message });
    }
  })));

  app.delete("/api/github/conflicts", coordinator.wrap(recovery.wrap("cancel-conflicts", async (_req, res) => {
    try {
      clearPendingConflicts();
      res.json({ message: "Pending conflicts cleared" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  })));

  return httpServer;
}

return registerRoutes;
}

export const registerRoutes = createSyncRouteRegistrar({
  filesystem: fs,
  github: { githubRequest, getAuthenticatedUser, getRepository, createRepository, pushCodebase, pushCodebaseWithDeletions, getRepoTree, getRepoTreeAtCommit, getFileContent, getFileContentAtCommit },
  checkpoint: { getLastSyncedCommit, setLastSyncedCommit },
  conflicts: { getPendingConflicts, setPendingConflicts, clearPendingConflicts },
  cwd: () => fs.realpathSync(process.cwd()),
  clock: Date,
});
