import { expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { withDatabaseAfterPull } from "../sync-database-upgrades";
import { createSyncCoordinator } from "../sync-coordination";
import { createSyncRouteRegistrar, type SyncRouteAdapters } from "../routes";
import { computeGitBlobSha } from "../sync-plan";
import type { DatabaseCompatibilityReport } from "../../shared/database-compatibility";

const ready: DatabaseCompatibilityReport = {
  status: "compatible", message: "Database verified.", pending: [], issues: [], documentVersion: 1, checkedLoans: 0,
};
function response() {
  return { statusCode: 200, body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.body = body; return this; } };
}
it.each([
  ["pull", 200, { message: "Up to date", conflicts: [] }, true],
  ["pull", 200, { message: "Pulled", hasConflicts: false }, true],
  ["pull", 200, { hasConflicts: true }, false],
  ["pull", 200, { conflicts: [{}] }, false],
  ["pull", 500, { error: "Sync incomplete" }, false],
  ["pull", 409, { error: "Stale plan" }, false],
  ["resolve-conflicts", 200, { message: "Resolved", operation: "pull" }, true],
  ["resolve-conflicts", 200, { message: "Resolved", operation: "push" }, false],
] as const)("runs only after a completed pull: %s %i %j", async (operation, status, body, expected) => {
  const upgrade = vi.fn(async () => ready);
  const res = response();
  await withDatabaseAfterPull(async (_req, response) => { response.status(status).json(body); },
    operation, upgrade)({} as any, res as any, () => {});
  expect(upgrade).toHaveBeenCalledTimes(expected ? 1 : 0);
  expect(res.statusCode).toBe(status);
  if (expected) expect(res.body.database).toEqual(ready);
  else expect(res.body).toEqual(body);
});
it("keeps a successful code pull successful if database completion throws", async () => {
  const res = response();
  await withDatabaseAfterPull(async (_req, response) => { response.json({ commitSha: "saved", message: "Pulled" }); },
    "pull", async () => { throw new Error("private driver detail"); })({} as any, res as any, () => {});
  expect(res.statusCode).toBe(200);
  expect(res.body.commitSha).toBe("saved");
  expect(res.body.database.status).toBe("unavailable");
  expect(JSON.stringify(res.body)).not.toContain("private driver detail");
});
it("does not upgrade while another pending conflict plan exists", async () => {
  const upgrade = vi.fn(async () => ready);
  const res = response();
  await withDatabaseAfterPull(async (_req, response) => { response.json({ message: "Up to date" }); },
    "pull", upgrade, () => true)({} as any, res as any, () => {});
  expect(upgrade).not.toHaveBeenCalled();
  expect(res.body.database.status).toBe("blocked");
});

it("actual pull route commits recovery first and holds the sync lock during database work", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "auto-db-pull-"));
  let checkpoint: string | null = null;
  let pending: any = null;
  const content = "fixture data";
  const tree = [{ path: "fixture.txt", type: "blob", sha: computeGitBlobSha(Buffer.from(content)), size: content.length }];
  const coordinator = createSyncCoordinator(root);
  const upgrade = vi.fn(async () => {
    expect(checkpoint).toBe("remote-head");
    expect(pending).toBeNull();
    expect(JSON.parse(fs.readFileSync(path.join(root, ".local/github-sync-recovery.json"), "utf8")).complete).toBe(true);
    await expect(coordinator.acquire()).rejects.toMatchObject({ code: "EADDRINUSE" });
    return ready;
  });
  const noNetwork = async () => { throw new Error("Unexpected transport call"); };
  const routes = new Map<string, any>();
  const app: any = {};
  for (const method of ["get", "post", "put", "delete"])
    app[method] = (name: string, handler: any) => routes.set(`${method} ${name}`, handler);
  const adapters: SyncRouteAdapters = {
    filesystem: fs, cwd: () => root, clock: Date, databaseAfterPull: upgrade,
    checkpoint: { getLastSyncedCommit: () => checkpoint, setLastSyncedCommit: sha => { checkpoint = sha; } },
    conflicts: { getPendingConflicts: () => pending, setPendingConflicts: value => { pending = value; }, clearPendingConflicts: () => { pending = null; } },
    github: {
      githubRequest: async () => ({ object: { sha: "remote-head" } }),
      getRepoTree: async () => ({ commitSha: "remote-head", tree }),
      getFileContent: async () => content, getFileContentAtCommit: noNetwork,
      getRepoTreeAtCommit: noNetwork, getAuthenticatedUser: noNetwork, getRepository: noNetwork,
      createRepository: noNetwork, pushCodebase: noNetwork, pushCodebaseWithDeletions: noNetwork,
    },
  };
  try {
    await createSyncRouteRegistrar(adapters)({} as any, app);
    const res = response();
    await routes.get("post /api/github/pull")({ body: {} }, res, () => {});
    expect(res.statusCode).toBe(200);
    expect(upgrade).toHaveBeenCalledOnce();
    expect(res.body.database.status).toBe("compatible");
    expect(fs.readFileSync(path.join(root, "fixture.txt"), "utf8")).toBe(content);
    const release = await coordinator.acquire(); await release();
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
