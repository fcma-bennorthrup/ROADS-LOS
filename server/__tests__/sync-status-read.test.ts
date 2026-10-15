import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { statusReadDeadline, statusLocalFiles, statusContentSize, StatusReadTimeout } from "../sync-status-read";
import { createSyncCoordinator } from "../sync-coordination";
import { prepareEligibility } from "../sync-eligibility";
import { createSyncMechanics, MAX_FILE_SIZE } from "../sync-mechanics";
import express from "express";
import { createServer } from "node:http";
import { createSyncRouteRegistrar, type SyncRouteAdapters } from "../routes";

test("known tree sizes need no remote content, preserving eligibility and diffs", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "status-test-"));
  try {
    fs.writeFileSync(path.join(root, "changed.txt"), "new");
    fs.writeFileSync(path.join(root, "image.pdf"), Buffer.from([255, 0]));
    fs.writeFileSync(path.join(root, "oversized.txt"), "local");
    fs.writeFileSync(path.join(root, ".env"), "synthetic");
    fs.symlinkSync(path.join(root, "changed.txt"), path.join(root, "link.txt"));
    const tree = [
      { path: "changed.txt", type: "blob", sha: "old", size: 3 },
      { path: "image.pdf", type: "blob", sha: "old", size: 2 },
      { path: "deleted.txt", type: "blob", sha: "old", size: 3 },
      { path: "missing.pdf", type: "blob", sha: "old", size: 3 },
      { path: "oversized.txt", type: "blob", sha: "old", size: MAX_FILE_SIZE + 1 },
      { path: "link.txt", type: "blob", sha: "old", size: 3 },
      { path: ".env", type: "blob", sha: "old", size: 3 },
    ];
    const transport = {
      getFileContent: async () => "old",
      getFileContentAtCommit: async () => "old",
    };
    const old = await prepareEligibility(fs, transport, root, "o", "r", [], tree, "pinned");
    const current = await statusLocalFiles(fs, root, tree, async () => {
      throw new Error("Known sizes must not download content");
    });
    const { diffAgainstRemoteTree } = createSyncMechanics(fs, transport, "o", "r");
    const before = diffAgainstRemoteTree(old.local,
      tree.filter(f => !old.skipped.includes(f.path) && !old.excluded.includes(f.path)), root);
    assert.deepEqual(diffAgainstRemoteTree(current.local, current.tree, root), before);
    assert.deepEqual(before.deletions, ["deleted.txt"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("unknown sizes use the supplied pinned reader and propagate failures", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "status-test-"));
  try {
    const tree = [{ path: "file.txt", type: "blob", sha: "old" }];
    let reads = 0;
    const result = await statusLocalFiles(fs, root, tree, async () => { reads++; return MAX_FILE_SIZE + 1; });
    assert.equal(reads, 1);
    assert.deepEqual(result.tree, []);
    await assert.rejects(statusLocalFiles(fs, root, tree, async () => { throw new Error("offline"); }), /offline/);
    assert.equal(statusContentSize("image.pdf", "/wA="), 2);
    assert.throws(() => statusContentSize("file.txt", null), /could not be downloaded/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("deadline returns successful reads and propagates transport errors", async () => {
  const deadline = statusReadDeadline(1000);
  assert.equal(await deadline.read(async () => 42), 42);
  await assert.rejects(deadline.read(async () => { throw new Error("offline"); }), /offline/);
});

test("a timed-out read releases coordination and ignores late results", async () => {
  const coordinator = createSyncCoordinator(`status-fixture-${process.pid}-${Date.now()}`);
  let resolve!: (value: number) => void;
  const pending = new Promise<number>(r => { resolve = r; });
  let cached = false;
  const handler = coordinator.wrap(async () => {
    try {
      await statusReadDeadline(20).read(() => pending);
      cached = true;
    } catch (error) { assert.ok(error instanceof StatusReadTimeout); }
  });
  const running = handler({} as any, {} as any, () => {});
  await new Promise(r => setTimeout(r, 1));
  await assert.rejects(coordinator.acquire(), { code: "EADDRINUSE" });
  await running;
  const release = await coordinator.acquire();
  await release();
  resolve(42);
  await new Promise(r => setImmediate(r));
  assert.equal(cached, false);
  const expired = statusReadDeadline(0);
  let invoked = false;
  await assert.rejects(expired.read(async () => { invoked = true; }), StatusReadTimeout);
  assert.equal(invoked, false);
});

test("status route returns JSON, avoids content downloads and does not cache timeouts", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "status-route-test-"));
  const app = express();
  const server = createServer(app);
  let fail = true;
  let heads = 0;
  const unexpected = async () => { throw new Error("Unexpected GitHub operation"); };
  const github = new Proxy({
    getRepoTree: async () => {
      heads++;
      if (fail) throw new StatusReadTimeout();
      return { commitSha: "checkpoint", tree: [] };
    },
    getRepoTreeAtCommit: async () => ({ tree: [] }),
  }, { get: (target, key) => target[key as keyof typeof target] ?? unexpected });
  try {
    const register = createSyncRouteRegistrar({
      filesystem: fs, github: github as unknown as SyncRouteAdapters["github"],
      checkpoint: { getLastSyncedCommit: () => "checkpoint", setLastSyncedCommit: () => assert.fail("checkpoint write") },
      conflicts: { getPendingConflicts: () => null, setPendingConflicts: () => assert.fail("conflict write"),
        clearPendingConflicts: () => assert.fail("conflict clear") },
      cwd: () => root, clock: Date,
    });
    await register(server, app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    const url = `http://127.0.0.1:${address.port}/api/github/sync-status`;
    const failed = await fetch(url);
    assert.equal(failed.status, 504);
    assert.match((await failed.json()).error, /timed out/);
    fail = false;
    const success = await fetch(url);
    assert.equal(success.status, 200);
    assert.equal((await success.json()).inSync, true);
    assert.equal(heads, 2);
    const cached = await fetch(url);
    assert.equal(cached.status, 200);
    await cached.json();
    assert.equal(heads, 2);
    assert.deepEqual(fs.readdirSync(root), []);
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
