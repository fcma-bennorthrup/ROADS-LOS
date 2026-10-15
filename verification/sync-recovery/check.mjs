import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { build } from "esbuild";
import { compile, run } from "../credential-sync/routes.mjs";

const candidate = await compile(readFileSync("server/routes.ts", "utf8"));
const baseline = (await build({
  entryPoints: [path.join(process.argv[2], "server/routes.ts")], bundle: true,
  write: false, platform: "node", format: "cjs",
  plugins: [{ name: "fake", setup(builder) {
    builder.onResolve({ filter: /^\.\/(github|storage|sync-state|pending-conflicts)$/ },
      ({ path: name }) => ({ path: `fake:${name.slice(2)}`, external: true }));
  } }],
})).outputFiles[0].text;
const response = (result, i = 0) => JSON.parse(result.responses[i].bytes);
const journalName = ".local/github-sync-recovery.json";
const journal = (r) => JSON.parse(r.local[journalName]);
const pending = { operation: "pull", conflicts: [
  { path: "a.txt", localContent: "old", remoteContent: "new", baseContent: "base", reason: "changed" },
], safeToUpdate: [], remoteHeadSha: "head", createdAt: "2026-10-14T16:00:00Z" };
let cases = 0;
async function scenario(options) { cases++; return run(candidate, { empty: true, ...options }); }
const incomplete = (r) => {
  assert.equal(r.responses[0].status, 500);
  assert.match(response(r).error, /^Sync incomplete\./);
  assert.equal(r.last, "base");
  assert.equal(journal(r).complete, false);
};
for (const force of [false, true]) {
  const options = { route: "post /api/github/pull", body: { force },
    base: { "a.txt": "old", "b.txt": "old", "c.txt": "old" },
    local: { "a.txt": "old", "b.txt": "old", "c.txt": "old" },
    remote: { "a.txt": "new", "b.txt": "new", "c.txt": "new" }, pending };
  const failed = await scenario({ ...options, failWrite: "b.txt" });
  incomplete(failed);
  assert.equal(failed.local["a.txt"], "new");
  assert.equal(failed.local["b.txt"], "old");
  assert.equal(failed.local["c.txt"], "old");
  assert.deepEqual(failed.pending, pending);
  assert.deepEqual(journal(failed).steps.map((s) => s.state), ["completed", "failed", "not-attempted"]);
  const retried = await scenario({ ...options, local: failed.local });
  assert.equal(retried.responses[0].status, 200, response(retried).error);
  assert.equal(retried.local["b.txt"], "new");
  assert.equal(retried.last, "head");
  assert.equal(journal(retried).complete, true);
  const edited = await scenario({ ...options, local: { ...failed.local, "b.txt": "new user edit" } });
  incomplete(edited);
  assert.equal(edited.local["b.txt"], "new user edit");
  assert.ok(!edited.trace.some((t) => t[0] === "write"));
  const status = await scenario({ ...options, local: failed.local, route: "get /api/github/sync-status" });
  assert.equal(response(status).inSync, false);
  assert.equal(response(status).lastSyncedCommitSha, "base");
  assert.equal(response(status).recovery.outcomes.length, 3);
}
const deletion = await scenario({
  route: "post /api/github/pull", base: { "a.txt": "old", "b.txt": "old" },
  local: { "a.txt": "old", "b.txt": "old" }, remote: {},
  failDelete: "b.txt", pending,
});
incomplete(deletion);
assert.equal(deletion.local["a.txt"], undefined);
assert.equal(deletion.local["b.txt"], "old");
assert.deepEqual(deletion.pending, pending);
const deletionRetry = await scenario({
  route: "post /api/github/pull", base: { "a.txt": "old", "b.txt": "old" },
  local: deletion.local, remote: {}, pending,
});
assert.equal(deletionRetry.last, "head");

const writeOptions = { route: "post /api/github/pull", local: { "a.txt": "old" },
  remote: { "a.txt": "new" }, base: { "a.txt": "old" }, pending };
for (const failure of [
  { failCheckpoint: true }, { failJournalWrite: 2 }, { failJournalWrite: 3 },
  { failJournalRename: 2 }, { failJournalRename: 3 },
]) {
  const failed = await scenario({ ...writeOptions, ...failure });
  incomplete(failed);
  assert.deepEqual(failed.pending, pending);
  const retry = await scenario({ ...writeOptions, local: failed.local });
  assert.equal(retry.last, "head");
  assert.equal(journal(retry).complete, true);
}
// Interruption after replacing legacy checkpoint, before completion journal:
// readers still expose the old common ancestor and a manual retry completes.
const interrupted = await scenario({ ...writeOptions, failJournalWrite: 5 });
assert.equal(interrupted.responses[0].status, 500);
assert.equal(interrupted.last, "head");
assert.equal(journal(interrupted).complete, false);
const interruptedStatus = await scenario({ ...writeOptions, local: interrupted.local,
  last: interrupted.last, route: "get /api/github/sync-status" });
assert.equal(response(interruptedStatus).lastSyncedCommitSha, "base");
assert.equal(response(interruptedStatus).inSync, false);
const completedRetry = await scenario({ ...writeOptions, local: interrupted.local, last: interrupted.last });
assert.equal(journal(completedRetry).checkpoint, "head");
assert.equal(journal(completedRetry).complete, true);
const torn = await scenario({ ...writeOptions, partialWrite: "a.txt" });
incomplete(torn);
const blockedTorn = await scenario({ ...writeOptions, local: torn.local });
incomplete(blockedTorn);
assert.ok(!blockedTorn.trace.some((t) => t[0] === "write"));
const mkdir = await scenario({ route: "post /api/github/pull", last: null,
  remote: { "new/a.txt": "new" }, failMkdir: "new" });
assert.equal(mkdir.responses[0].status, 500);
assert.equal(mkdir.last, null);
assert.equal(journal(mkdir).complete, false);
assert.equal(journal(mkdir).steps[0].state, "not-attempted");
const metadataFailure = await scenario({
  route: "post /api/github/pull", local: { "a.txt": "old", "b.txt": "ours" },
  remote: { "a.txt": "new", "b.txt": "theirs" }, base: { "a.txt": "old", "b.txt": "base" },
  pending, failPending: true,
});
incomplete(metadataFailure);
assert.deepEqual(metadataFailure.pending, pending);

for (const failure of [{ nullFetch: "a.txt" }, { fetchErrors: { "a.txt": "network failure" } }, { failRead: "a.txt" }]) {
  const result = await scenario({ route: "post /api/github/pull", local: { "a.txt": "old" },
    remote: { "a.txt": "new" }, base: { "a.txt": "old" }, ...failure });
  assert.equal(result.responses[0].status, 500);
  assert.equal(result.last, "base");
  assert.ok(!result.trace.some((t) => t[0] === "write"));
}
for (const force of [false, true]) {
  const opts = { route: "post /api/github/push", body: { force }, head: "base",
    local: { "a.txt": "new" }, base: { "a.txt": "old" }, remote: { "a.txt": "old" }, pending };
  const failed = await scenario({ ...opts, failPush: true });
  incomplete(failed);
  assert.equal(journal(failed).steps[0].state, "uncertain");
  assert.deepEqual(failed.pending, pending);
  assert.equal(failed.trace.filter((t) => t[0] === "push").length, 1);
  // Response lost after remote accepted: read remote, replan, no second push.
  const retry = await scenario({ ...opts, local: failed.local, remote: { "a.txt": "new" }, head: "published" });
  assert.equal(retry.last, "published");
  assert.ok(!retry.trace.some((t) => t[0] === "push"));
  const ambiguous = await scenario({ ...opts, local: failed.local, remote: { "a.txt": "other" }, head: "other" });
  incomplete(ambiguous);
  assert.ok(!ambiguous.trace.some((t) => t[0] === "push"));
}
for (const operation of ["pull", "push"]) {
  const result = await scenario({
    route: "post /api/github/resolve-conflicts",
    body: { resolutions: [{ path: "a.txt", resolvedContent: "resolved" }] },
    pending: { ...pending, operation },
    local: { "a.txt": "old" }, remote: { "a.txt": "new" }, base: { "a.txt": "base" },
    failWrite: "a.txt",
  });
  incomplete(result);
  assert.equal(result.pending.operation, operation);
}
const resolutionOptions = { route: "post /api/github/resolve-conflicts",
  body: { resolutions: [{ path: "a.txt", resolvedContent: "resolved" }] },
  pending: { ...pending, operation: "push" }, local: { "a.txt": "old" },
  remote: { "a.txt": "new" }, base: { "a.txt": "base" } };
const resolutionLost = await scenario({ ...resolutionOptions, failPush: true });
incomplete(resolutionLost);
const resolutionRecovered = await scenario({ ...resolutionOptions, local: resolutionLost.local,
  remote: { "a.txt": "resolved" }, head: "published" });
assert.equal(resolutionRecovered.responses[0].status, 200);
assert.equal(resolutionRecovered.last, "published");
assert.equal(resolutionRecovered.pending, null);
assert.ok(!resolutionRecovered.trace.some((t) => t[0] === "push" || (t[0] === "write" && t[1] === "a.txt")));
const staleOptions = { ...resolutionOptions, head: "advanced", remote: { "a.txt": "new remote" } };
const stale = await scenario(staleOptions);
assert.equal(stale.responses[0].status, 409);
assert.equal(response(stale).staleHead, true);
assert.match(response(stale).error, /Please pull again/);
assert.equal(stale.local["a.txt"], "old");
assert.equal(stale.local[journalName], undefined);
assert.equal(stale.pending, null);
assert.ok(!stale.trace.some((t) => ["write", "push", "set-last"].includes(t[0])));
const staleThenPull = await scenario({ ...staleOptions, requests: [
  [staleOptions.route, staleOptions.body], ["delete /api/github/conflicts"],
  ["post /api/github/pull", {}],
] });
assert.equal(staleThenPull.responses[2].status, 200);
// The fixture already had a local edit relative to "base"; normal pull must
// preserve it as a conflict, not advance the checkpoint.
assert.equal(response(staleThenPull, 2).hasConflicts, true);
assert.equal(staleThenPull.last, "base");
// Emulate an older unfinished local-only resolution: local write happened,
// then the stale response was returned, before any upload was attempted.
const oldIntent = await scenario({ ...resolutionOptions, failWrite: "a.txt" });
const oldRecord = journal(oldIntent);
oldRecord.steps[0].state = "completed";
const oldLocal = { ...oldIntent.local, "a.txt": "resolved",
  [journalName]: JSON.stringify(oldRecord) };
const oldRetry = await scenario({ ...staleOptions, local: oldLocal });
assert.equal(oldRetry.responses[0].status, 409);
assert.equal(response(oldRetry).staleHead, true);
assert.equal(oldRetry.local["a.txt"], "resolved");
const oldReconcile = await scenario({ ...staleOptions, local: oldLocal, requests: [
  [staleOptions.route, staleOptions.body], ["delete /api/github/conflicts"],
  ["post /api/github/pull", {}],
] });
assert.equal(oldReconcile.responses[2].status, 200);
assert.equal(response(oldReconcile, 2).hasConflicts, true);
assert.equal(oldReconcile.local["a.txt"], "resolved");
assert.equal(oldReconcile.last, "base");
assert.equal(journal(oldReconcile).checkpoint, "base");
const changedOldIntent = await scenario({ ...staleOptions, local: { ...oldLocal, "a.txt": "later edit" },
  route: "post /api/github/pull", body: {} });
assert.equal(changedOldIntent.responses[0].status, 500);
assert.ok(!changedOldIntent.trace.some((t) => ["write", "push", "set-last"].includes(t[0])));

// Successful responses retain their exact bytes and statuses, including no-ops,
// force behavior, conflicts and oversized preservation messages.
for (const operation of ["pull", "push"]) {
  for (const force of [false, true]) {
    for (const mode of ["initial", "unchanged", "changed", "conflict", "oversized"]) {
      const options = { empty: true, route: `post /api/github/${operation}`, body: { force },
        last: mode === "initial" ? null : "base", head: mode === "unchanged" ? "base" : "head",
        base: { "a.txt": "old" }, local: { "a.txt": operation === "push" || mode === "conflict" ? "ours" : "old" },
        remote: { "a.txt": operation === "pull" || mode === "conflict" ? "theirs" : "old" },
        ...(mode === "oversized" ? { sizes: { "a.txt": 8 * 1024 * 1024 }, remoteSizes: { "a.txt": 8 * 1024 * 1024 } } : {}),
      };
      const before = await run(baseline, options);
      const after = await scenario(options);
      assert.deepEqual(after.responses, before.responses, JSON.stringify({ operation, force, mode }));
      assert.equal(after.last, before.last);
      assert.deepEqual(after.pending, before.pending);
      const effects = (r) => r.trace.filter((t) => ["write", "unlink", "push", "set-last", "set-pending", "clear-pending"].includes(t[0])
        && !(typeof t[1] === "string" && t[1].startsWith(".local/")));
      assert.deepEqual(effects(after), effects(before));
    }
  }
}

// Both low-level upload paths must stop before publishing any incomplete tree.
const githubCode = (await build({
  entryPoints: ["server/github.ts"], bundle: true, write: false, platform: "node", format: "cjs",
  external: ["@replit/connectors-sdk"],
})).outputFiles[0].text;
for (const method of ["pushCodebase", "pushCodebaseWithDeletions"]) {
  for (const failure of ["null", "413", "network", "tree", "commit", "ref"]) {
    cases++;
    const calls = [];
    const exports = {};
    const context = vm.createContext({ exports, module: { exports }, Buffer, console,
      require(name) {
        assert.equal(name, "@replit/connectors-sdk");
        return { ReplitConnectors: class { proxy() { throw new Error("REAL TRANSPORT BLOCKED"); } } };
      },
    });
    vm.runInContext(githubCode, context);
    const operations = context.module.exports.createGithubOperations(async (endpoint, options = {}) => {
      calls.push([endpoint, options.method]);
      if (endpoint.includes("/git/ref/")) return { object: { sha: "base" } };
      if (endpoint.endsWith("/git/commits/base")) return { tree: { sha: "tree" } };
      if (endpoint.endsWith("/git/blobs")) {
        if (failure === "null") return {};
        if (["413", "network"].includes(failure)) throw new Error(failure);
        return { sha: "blob" };
      }
      if (endpoint.endsWith("/git/trees")) { if (failure === "tree") throw new Error("tree"); return { sha: "new-tree" }; }
      if (endpoint.endsWith("/git/commits")) { if (failure === "commit") throw new Error("commit"); return { sha: "new-commit" }; }
      if (endpoint.endsWith("/git/refs/heads/main")) throw new Error("response lost");
      throw new Error("Unexpected fake request");
    });
    const args = ["owner", "repo", [{ path: "a.txt", content: "a" }, { path: "b.txt", content: "b" }]];
    if (method.endsWith("WithDeletions")) args.push(["deleted.txt"]);
    args.push("message");
    await assert.rejects(() => operations[method](...args));
    if (["null", "413", "network"].includes(failure)) assert.equal(calls.filter(([p]) => p.endsWith("/git/blobs")).length, 1);
    assert.equal(calls.filter(([p]) => p.endsWith("/git/refs/heads/main")).length, failure === "ref" ? 1 : 0);
  }
}
console.log(`PASS: ${cases} isolated recovery/route/upload cases; successful response bytes and ordered mutation calls unchanged.`);
