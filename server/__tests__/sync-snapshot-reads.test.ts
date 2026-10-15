import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { prepareEligibility, readSnapshotContent, SnapshotReadTimeout } from "../sync-eligibility";
import { computeGitBlobSha } from "../sync-plan";
import { createSyncCoordinator } from "../sync-coordination";

test("hundreds of unchanged files reuse hash-verified content; a changed file is read once", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "snapshot-cache-"));
  try {
    const tree = [];
    for (let n = 0; n < 390; n++) {
      const name = `file-${n}.txt`;
      fs.writeFileSync(path.join(root, name), `value-${n}`);
      tree.push({ path: name, type: "blob", sha: computeGitBlobSha(Buffer.from(`value-${n}`)) });
    }
    fs.writeFileSync(path.join(root, "file-0.txt"), "changed");
    const calls: string[] = [];
    const snapshot = await prepareEligibility(fs, {
      getFileContent: async (_o, _r, name, ref) => {
        assert.equal(ref, "remote-pinned"); calls.push(name); return "value-0";
      },
      getFileContentAtCommit: async () => assert.fail("Identical base blob should be reused"),
    }, root, "owner", "repo", tree, tree, "base-pinned", "remote-pinned");
    assert.deepEqual(calls, ["file-0.txt"]);
    assert.equal(snapshot.local.length, 390);
    assert.equal(snapshot.remote.length, 390);
    assert.equal(snapshot.base.length, 390);
    assert.equal(snapshot.local.find(f => f.path === "file-0.txt")?.content, "changed");
    assert.equal(snapshot.base.find(f => f.path === "file-0.txt")?.content, "value-0");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("different pinned versions are read separately and binary bytes are preserved", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "snapshot-cache-"));
  try {
    const bytes = Buffer.from([255, 0, 128]);
    fs.writeFileSync(path.join(root, "file.pdf"), bytes);
    const binary = { path: "file.pdf", type: "blob", sha: computeGitBlobSha(bytes) };
    const file = (content: string) => ({ path: "file.txt", type: "blob", sha: computeGitBlobSha(Buffer.from(content)) });
    const calls: string[] = [];
    const result = await prepareEligibility(fs, {
      getFileContent: async (_o, _r, name, ref) => { calls.push(`${name}:${ref}`); return "remote"; },
      getFileContentAtCommit: async (_o, _r, name, ref) => { calls.push(`${name}:${ref}`); return "base"; },
    }, root, "owner", "repo", [binary, file("remote")], [binary, file("base")], "base", "remote");
    assert.deepEqual(calls, ["file.txt:remote", "file.txt:base"]);
    assert.equal(result.remote.find(f => f.path === "file.pdf")?.content, bytes.toString("base64"));
    assert.equal(result.base.find(f => f.path === "file.txt")?.content, "base");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a stalled comparison releases its lock and cannot proceed after a late response", async () => {
  const coordinator = createSyncCoordinator(`snapshot-timeout-${process.pid}`);
  let finish!: (value: string) => void;
  let wrote = false;
  const pending = new Promise<string>(resolve => { finish = resolve; });
  await coordinator.wrap(async () => {
    try {
      await readSnapshotContent(() => pending, 20);
      wrote = true;
    } catch (error) { assert.ok(error instanceof SnapshotReadTimeout); }
  })({} as any, {} as any, () => {});
  const release = await coordinator.acquire();
  await release();
  finish("late");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(wrote, false);
});
