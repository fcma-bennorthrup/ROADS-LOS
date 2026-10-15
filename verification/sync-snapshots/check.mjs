import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import path from "node:path";
import vm from "node:vm";
import { spawn } from "node:child_process";
import { compile, run } from "../credential-sync/routes.mjs";

const candidate = await compile(readFileSync("server/routes.ts", "utf8"));
const baseline = (await build({
  entryPoints: [path.join(process.argv[2], "server/routes.ts")], bundle: true, write: false,
  platform: "node", format: "cjs", plugins: [{ name: "fake", setup(b) {
    b.onResolve({ filter: /^\.\/(github|storage|sync-state|pending-conflicts)$/ },
      ({ path: name }) => ({ path: `fake:${name.slice(2)}`, external: true }));
  } }],
})).outputFiles[0].text;
const sha = bytes => createHash("sha1").update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest("hex");
const json = (r, i = 0) => JSON.parse(r.responses[i].bytes);
const record = r => JSON.parse(r.local[".local/github-sync-recovery.json"]);
const writes = r => r.trace.filter(t => ["write", "unlink", "push", "set-last", "set-pending", "clear-pending"].includes(t[0]));
let cases = 0;
async function test(name, fn) { await fn(); cases++; console.log("PASS", name); }
const execute = options => run(candidate, { empty: true, ...options });
const pending = { operation: "pull", conflicts: [
  { path: "a.txt", localContent: "ours", remoteContent: "theirs", baseContent: "base", reason: "changed" },
], safeToUpdate: [], remoteHeadSha: "head", createdAt: "2026-10-14T16:00:00Z" };
const resolution = { route: "post /api/github/resolve-conflicts",
  body: { resolutions: [{ path: "a.txt", resolvedContent: "resolved" }] },
  pending, decoratePending: true, autoPlan: true, local: { "a.txt": "ours" },
  remote: { "a.txt": "theirs" }, base: { "a.txt": "base" } };

await test("raw-byte hashes distinguish invalid UTF-8 at detection and resolution", async () => {
  const before = Buffer.from([0x80]), after = Buffer.from([0x81]);
  assert.equal(before.toString("utf8"), after.toString("utf8"));
  assert.notEqual(sha(before), sha(after));
  const detected = await execute({ route: "post /api/github/push",
    local: { "a.txt": before }, remote: { "a.txt": "theirs" }, base: { "a.txt": "base" } });
  assert.equal(detected.responses[0].status, 409);
  assert.equal(detected.pending.localHashes["a.txt"], sha(before));
  for (const operation of ["pull", "push"]) {
    const plan = { ...pending, operation, localHashes: { "a.txt": sha(before) } };
    const rejected = await execute({ ...resolution, pending: plan, decoratePending: false,
      local: { "a.txt": before }, onTree({ local }) { local["a.txt"] = after; } });
    assert.equal(rejected.responses[0].status, 409);
    assert.deepEqual(writes(rejected), []);
    const duringDownload = await execute({ route: `post /api/github/${operation}`,
      local: { "a.txt": before }, remote: { "a.txt": "theirs" }, base: { "a.txt": "base" },
      onContent({ local }) { local["a.txt"] = after; } });
    assert.equal(duringDownload.responses[0].status, 409);
    assert.deepEqual(writes(duringDownload), []);
  }
});
await test("retained captures stay outside custom sync discovery", async () => {
  const r = await execute({ route: "post /api/github/push", last: null,
    local: { "a.txt": "ours", ".local/verification/sync-snapshots/capture.png": "synthetic capture",
      ".local/verification/sync-snapshots/states.json": "synthetic states" } });
  assert.equal(r.responses[0].status, 200);
  const push = r.trace.find(t => t[0] === "push");
  assert.deepEqual(push[1].map(f => f.path), ["a.txt"]);
});

for (const operation of ["pull", "push"]) {
  for (const mode of ["normal", "force", "initial", "unchanged", "conflict"]) {
    await test(`${operation} ${mode}: successful contract`, async () => {
      const opts = { empty: true, route: `post /api/github/${operation}`,
        body: { force: mode === "force" }, last: mode === "initial" ? null : "base",
        head: mode === "unchanged" ? "base" : "head",
        base: { "a.txt": "base" }, local: { "a.txt": mode === "conflict" || operation === "push" ? "ours" : "base" },
        remote: { "a.txt": mode === "conflict" || operation === "pull" ? "theirs" : "base" } };
      const current = await execute(opts), before = await run(baseline, opts);
      const body = json(current); delete body.planId;
      assert.equal(JSON.stringify(body), before.responses[0].bytes);
      assert.equal(current.responses[0].status, before.responses[0].status);
      const effects = r => writes(r).filter(t => !String(t[1]).startsWith(".local/"))
        .map(t => {
          if (t[0] === "set-pending") { const value = { ...t[1] }; delete value.localHashes; return [t[0], value]; }
          return t;
        });
      assert.deepEqual(effects(current), effects(before));
    });
  }
  await test(`${operation}: pinned download and stale preflight writes nothing`, async () => {
    const refs = [];
    const r = await execute({ route: `post /api/github/${operation}`,
      base: { "a.txt": "base" }, local: { "a.txt": "base" }, remote: { "a.txt": "theirs" },
      onContent({ ref }) { refs.push(ref); return { content: "theirs" }; },
      onRef() { return { head: "advanced" }; } });
    assert.deepEqual(refs, ["head"]);
    assert.equal(r.responses[0].status, 409);
    assert.deepEqual(writes(r), []);
    assert.equal(r.local["a.txt"], "base");
  });
  await test(`${operation}: local edit while snapshot downloads rejects before writes`, async () => {
    const r = await execute({ route: `post /api/github/${operation}`,
      base: { "a.txt": "base" }, local: { "a.txt": "base" }, remote: { "a.txt": "theirs" },
      onContent({ local }) { local["a.txt"] = "later edit"; } });
    assert.equal(r.responses[0].status, 409); assert.deepEqual(writes(r), []);
  });
}
for (const operation of ["pull", "push"]) {
  await test(`${operation} resolution: exact success response`, async () => {
    const opts = { ...resolution, pending: { ...pending, operation } };
    const r = await execute(opts);
    const b = await run(baseline, { empty: true, ...opts });
    assert.equal(r.responses[0].status, 200, json(r).error);
    assert.equal(r.responses[0].bytes, b.responses[0].bytes);
    assert.equal(r.local["a.txt"], "resolved");
    assert.equal(record(r).pendingFile, null);
  });
  for (const stale of ["remote", "local", "plan", "legacy"]) {
    await test(`${operation} resolution ${stale}: no writes and retained plan`, async () => {
      const opts = { ...resolution, pending: { ...pending, operation } };
      if (stale === "remote") opts.head = "advanced";
      if (stale === "local") opts.onTree = ({ local }) => { local["a.txt"] = "later edit"; };
      if (stale === "plan") { opts.autoPlan = false; opts.body = { ...opts.body, planId: "old-plan" }; }
      if (stale === "legacy") opts.decoratePending = false;
      const r = await execute(opts);
      assert.equal(r.responses[0].status, 409);
      assert.match(json(r).error, /Run sync again/);
      assert.deepEqual(writes(r), []);
      assert.ok(r.pending);
    });
  }
}
await test("safe update and deletion bytes are part of pending-plan preflight", async () => {
  for (const kind of ["safeToUpdate", "safeToDelete"]) {
    const plan = { ...pending, operation: "push", [kind]: kind === "safeToDelete"
      ? ["b.txt"] : [{ path: "b.txt", content: "saved" }] };
    const r = await execute({ ...resolution, pending: plan,
      onTree({ local }) { local["b.txt"] = "new edit"; } });
    assert.equal(r.responses[0].status, 409); assert.deepEqual(writes(r), []);
  }
});
await test("newly detected plan token resolves and replaced token rejects", async () => {
  let token;
  await execute({ local: { "a.txt": "ours" }, remote: { "a.txt": "theirs" }, base: { "a.txt": "base" },
    requests: [], async onRegistered({ invoke }) {
      const detected = JSON.parse((await invoke(["post /api/github/push", {}])).bytes);
      token = detected.planId; assert.ok(token);
      const fetched = JSON.parse((await invoke(["get /api/github/conflicts"])).bytes);
      assert.equal(fetched.planId, token);
      const rejected = await invoke(["post /api/github/resolve-conflicts", { ...resolution.body, planId: "different" }]);
      assert.equal(rejected.status, 409);
      const accepted = await invoke(["post /api/github/resolve-conflicts", { ...resolution.body, planId: token }]);
      assert.equal(accepted.status, 200, accepted.bytes);
    } });
});
await test("overlap: all sync readers, writers and cancel reject without interleaving", async () => {
  let entered, proceed;
  const ready = new Promise(r => { entered = r; }), wait = new Promise(r => { proceed = r; });
  let first = true;
  await execute({ local: { "a.txt": "base" }, base: { "a.txt": "base" }, remote: { "a.txt": "theirs" },
    requests: [], async onContent() { if (first) { first = false; entered(); await wait; } },
    async onRegistered({ invoke, trace }) {
      const active = invoke(["post /api/github/pull", {}]); await ready;
      for (const route of ["post /api/github/pull", "post /api/github/push",
        "post /api/github/resolve-conflicts", "delete /api/github/conflicts",
        "get /api/github/conflicts", "get /api/github/sync-status"]) {
        const count = trace.length;
        const rejected = await invoke([route, resolution.body]);
        assert.equal(rejected.status, 409); assert.match(rejected.bytes, /Another sync/);
        assert.equal(trace.length, count);
      }
      proceed(); assert.equal((await active).status, 200);
      assert.equal((await invoke(["get /api/github/sync-status"])).status, 200);
    } });
});
const pull = { route: "post /api/github/pull", local: { "a.txt": "base", "b.txt": "base" },
  base: { "a.txt": "base", "b.txt": "base" }, remote: { "a.txt": "new", "b.txt": "new" }, pending };
for (const failure of ["write", "checkpoint", "clear", "completion"]) {
  await test(`interrupted ${failure}: old checkpoint and pending generation survive restart`, async () => {
    const opts = { ...pull };
    if (failure === "write") opts.failWrite = "b.txt";
    if (failure === "checkpoint") opts.failCheckpoint = true;
    if (failure === "clear") opts.failClear = true;
    if (failure === "completion") opts.onWrite = ({ name, content }) => {
      if (name === ".local/github-sync-recovery.json.tmp" && JSON.parse(String(content)).complete)
        throw Error("interrupted completion");
    };
    const failed = await execute(opts);
    assert.equal(failed.responses[0].status, 500);
    assert.equal(record(failed).complete, false);
    const restart = await execute({ ...pull, local: failed.local, last: failed.last, pending: failed.pending,
      requests: [["get /api/github/sync-status"], ["get /api/github/conflicts"]] });
    assert.equal(json(restart).lastSyncedCommitSha, "base");
    assert.equal(json(restart).inSync, false);
    assert.equal(json(restart, 1).hasConflicts, true);
    const retry = await execute({ ...pull, local: failed.local, last: failed.last, pending: failed.pending });
    assert.equal(retry.responses[0].status, 200, json(retry).error);
    assert.equal(record(retry).complete, true); assert.equal(record(retry).pendingFile, null);
  });
}
await test("partial resolution retry accepts only its previously written bytes", async () => {
  const opts = { ...resolution, pending: { ...pending, conflicts: [...pending.conflicts,
    { ...pending.conflicts[0], path: "b.txt" }] },
    local: { "a.txt": "ours", "b.txt": "ours" },
    remote: { "a.txt": "theirs", "b.txt": "theirs" },
    body: { resolutions: [{ path: "a.txt", resolvedContent: "resolved" }, { path: "b.txt", resolvedContent: "resolved" }] } };
  const failed = await execute({ ...opts, failWrite: "b.txt" });
  assert.equal(failed.responses[0].status, 500);
  const retry = await execute({ ...opts, local: failed.local, decoratePending: false, pending: failed.pending });
  assert.equal(retry.responses[0].status, 200, json(retry).error);
  const edited = await execute({ ...opts, local: { ...failed.local, "a.txt": "later edit" },
    decoratePending: false, pending: failed.pending });
  assert.equal(edited.responses[0].status, 500); assert.deepEqual(writes(edited), []);
});
await test("cancel uses the atomic pending generation and cannot discard incomplete work", async () => {
  const r = await execute({ pending, requests: [["delete /api/github/conflicts"], ["get /api/github/conflicts"]] });
  assert.equal(json(r, 1).hasConflicts, false);
  const failed = await execute({ ...pull, failWrite: "b.txt" });
  const cancel = await execute({ ...pull, local: failed.local, route: "delete /api/github/conflicts" });
  assert.equal(cancel.responses[0].status, 500); assert.deepEqual(writes(cancel), []);
});
// Real helper, fake GitHub. Deliberately advance HEAD both before any upload
// and after creating a commit; PATCH is never forced and old parent is retained.
const githubBundle = (await build({ entryPoints: ["server/github.ts"], bundle: true, write: false,
  platform: "node", format: "cjs", external: ["@replit/connectors-sdk"] })).outputFiles[0].text;
const githubModule = { exports: {} };
vm.runInNewContext(githubBundle, { exports: githubModule.exports, module: githubModule, Buffer,
  require(name) { if (name === "@replit/connectors-sdk") return { ReplitConnectors: class {} };
    if (name === "crypto") return { createHash };
    if (name === "path") return path;
    throw Error(name); } });
for (const method of ["pushCodebase", "pushCodebaseWithDeletions"]) {
  for (const mode of ["early", "late", "ref-race", "success"]) await test(`${method}: ${mode} HEAD`, async () => {
    const calls = []; let reads = 0;
    const api = githubModule.exports.createGithubOperations(async (endpoint, options = {}) => {
      calls.push([endpoint, options]);
      if (endpoint.includes("/git/ref/")) return { object: { sha: (++reads > 1 && mode === "late") || mode === "early" ? "advanced" : "head" } };
      if (endpoint.endsWith("/git/commits/head")) return { tree: { sha: "tree" } };
      if (endpoint.endsWith("/git/blobs")) return { sha: "blob" };
      if (endpoint.endsWith("/git/trees")) return { sha: "new-tree" };
      if (endpoint.endsWith("/git/commits")) return { sha: "new-commit", message: "message" };
      if (endpoint.includes("/git/refs/")) {
        assert.equal(options.body.force, undefined);
        if (mode === "ref-race") throw Error("non-fast-forward");
        return {};
      }
      throw Error(endpoint);
    });
    const args = ["owner", "repo", [{ path: "a.txt", content: "new" }]];
    if (method.endsWith("WithDeletions")) args.push([]);
    args.push("message", undefined, "head");
    if (mode === "success") await api[method](...args);
    else await assert.rejects(() => api[method](...args));
    if (mode === "early") assert.ok(!calls.some(([, o]) => o.method));
    if (mode === "late") assert.ok(!calls.some(([, o]) => o.method === "PATCH"));
    const commit = calls.find(([url, o]) => url.endsWith("/git/commits") && o.method === "POST");
    if (commit) assert.deepEqual(Array.from(commit[1].body.parents), ["head"]);
  });
}
await test("kernel lock excludes another process and releases on SIGKILL", async () => {
  const code = (await build({ entryPoints: ["server/sync-coordination.ts"], bundle: true,
    platform: "node", format: "cjs", write: false })).outputFiles[0].text;
  const boot = code + `\nmodule.exports.createSyncCoordinator(${JSON.stringify(process.cwd())}).acquire()
    .then(()=>process.stdout.write("locked\\n")).catch(e=>{process.stdout.write(e.code+"\\n");process.exit(2)});`;
  const start = () => spawn(process.execPath, ["-e", boot], { stdio: ["ignore", "pipe", "pipe"] });
  const line = child => new Promise((resolve, reject) => {
    child.stdout.once("data", data => resolve(String(data).trim()));
    child.once("error", reject);
  });
  const a = start();
  try {
    assert.equal(await line(a), "locked");
    const b = start(); assert.equal(await line(b), "EADDRINUSE");
    await new Promise(resolve => { a.once("exit", resolve); a.kill("SIGKILL"); });
    const c = start();
    try { assert.equal(await line(c), "locked"); } finally { c.kill(); }
  } finally { a.kill(); }
});
console.log(`PASS: ${cases} isolated snapshot, coordination, recovery and equivalence cases.`);
