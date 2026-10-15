import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import vm from "node:vm";
import { compile, run } from "../credential-sync/routes.mjs";

const candidate = await compile(readFileSync("server/routes.ts", "utf8"));
const baseline = await compile(readFileSync("baseline-routes.ts", "utf8"));
const pending = {
  operation: "push", remoteHeadSha: "head", safeToUpdate: [],
  conflicts: [{ path: "source.ts", localContent: "ours", remoteContent: "theirs", baseContent: "old", reason: "conflict" }],
};
const resolution = (body, plan = pending, extra = {}) => ({
  route: "post /api/github/resolve-conflicts", pending: plan, body, ...extra,
});
const resolve = [{ path: "source.ts", resolvedContent: "resolved\n✓" }];
const cases = [
  { route: "post /api/github/push", body: { force: true }, local: { "new.txt": "new\n✓", "image.png": "\0\u00ff" } },
  { route: "post /api/github/push", head: "base", sizes: { "source.ts": 7 * 1024 * 1024 + 1 } },
  { route: "post /api/github/push", head: "base", sizes: { "source.ts": 7 * 1024 * 1024 }, local: { "source.ts": "changed" } },
  { route: "post /api/github/push", head: "base", failRead: "source.ts" },
  { route: "post /api/github/push", local: { "source.ts": "changed" }, failPush: true },
  { route: "post /api/github/push", removeLocal: ["image.png"] },
  { route: "post /api/github/pull", body: { force: true }, failWrite: "source.ts" },
  { route: "post /api/github/pull", nullFetch: "source.ts" },
  { route: "post /api/github/pull", fetchErrors: { "source.ts": "404 not found" } },
  { route: "post /api/github/pull", fetchErrors: { "source.ts": "503 offline", ".npmrc": "500 failure" } },
  { route: "post /api/github/pull", removeRemote: ["source.ts"], failDelete: "source.ts" },
  { route: "get /api/github/sync-status", failHead: true },
  { route: "get /api/github/sync-status", failBase: true },
  resolution({}),
  resolution({ resolutions: [] }),
  resolution({ resolutions: [null] }),
  resolution({ resolutions: [{ path: "unknown", resolvedContent: "" }] }),
  resolution({ resolutions: [{ path: "source.ts", resolvedContent: 1 }] }),
  resolution({ resolutions: [{ path: "../escape", resolvedContent: "" }] },
    { ...pending, conflicts: [{ path: "../escape" }] }),
  resolution({ resolutions: resolve }, { ...pending, conflicts: [...pending.conflicts, { path: "other.ts" }] }),
  resolution({ resolutions: resolve }, pending, { head: "advanced" }),
  resolution(resolve, { ...pending, operation: "pull" }),
  resolution({ resolutions: [{ path: "source.ts", resolvedContent: null }] }),
  resolution({ resolutions: resolve }, pending, { failWrite: "source.ts" }),
  resolution({ resolutions: resolve }, pending, { failPush: true }),
  resolution({ resolutions: [...resolve, ...resolve] }),
  resolution({ resolutions: resolve }, null),
  { route: "post /api/github/pull", remoteAtFetch: { "source.ts": "moving HEAD text" } },
  { route: "post /api/github/pull", body: { force: "true" }, local: { "source.ts": "ours" }, remote: { "source.ts": "theirs" } },
  { route: "post /api/github/push", body: { message: "" }, local: { "source.ts": "new" } },
  { route: "get /api/github/user" },
  { route: "get /api/github/repo" },
  { route: "post /api/github/repo" },
  { route: "post /api/github/push", body: { force: true }, local: { "raw.png": Buffer.from([0, 255, 128]) } },
  { requests: [
    ["get /api/github/sync-status"],
    ["post /api/github/push", { force: true }],
    ["get /api/github/sync-status"],
  ] },
];
for (const [index, scenario] of cases.entries()) {
  const expected = await run(baseline, scenario);
  assert.deepEqual(await run(candidate, scenario), expected, `route ${index}`);
  assert.deepEqual(await run(candidate, { ...scenario, injected: true }), expected, `injected route ${index}`);
}
const stale = await run(candidate, cases[20]);
assert.equal(stale.local["source.ts"], "resolved\n✓");
assert.equal(stale.responses[0].status, 409); // Existing write-before-stale-check.
const partial = await run(candidate, cases[6]);
assert.equal(partial.last, "head"); // Existing partial-write checkpoint policy.
const binary = await run(candidate, cases[33]);
assert.equal(binary.trace.find((call) => call[0] === "push")[1].find((file) => file.path === "raw.png").content, "AP+A");
console.log(`PASS: ${cases.length} extra baseline/candidate route cases, through default and injected adapters.`);

async function githubCode(filename) {
  return (await build({
    stdin: { contents: readFileSync(filename, "utf8"), loader: "ts" },
    bundle: true, write: false, platform: "node", format: "cjs",
    external: ["@replit/connectors-sdk"],
  })).outputFiles[0].text;
}
const oldGithub = await githubCode("baseline-github.ts");
const newGithub = await githubCode("server/github.ts");
async function transaction(code, operation, args, options = {}, injected = false) {
  const trace = [];
  let index = 0;
  async function request(endpoint, opts = {}) {
    trace.push([endpoint, opts]);
    const step = index++;
    if (step === options.failAt) throw new Error(options.error ?? "synthetic transport failure");
    if (step === options.emptyAt) return {};
    if (endpoint.includes("/git/ref/")) return { object: { sha: "head" } };
    if (endpoint.includes("/git/commits/head")) return { tree: { sha: "base-tree" } };
    if (endpoint.endsWith("/git/blobs")) return { sha: `blob-${step}` };
    if (endpoint.endsWith("/git/trees")) return { sha: "new-tree" };
    if (endpoint.endsWith("/git/commits")) return { sha: "new-commit", message: "message" };
    if (endpoint.includes("/contents/")) return { encoding: "base64", content: Buffer.from("text\n✓").toString("base64") };
    if (endpoint.includes("?recursive")) return { tree: [] };
    return {};
  }
  const exports = {};
  const context = vm.createContext({
    module: { exports }, exports, Buffer, console: { error() {}, warn() {} },
    require(name) {
      assert.equal(name, "@replit/connectors-sdk");
      return { ReplitConnectors: class {
        async proxy(_name, endpoint, opts) {
          if (options.response) return {
            ok: options.response.status < 400, status: options.response.status,
            text: async () => options.response.text,
          };
          const result = await request(endpoint, { method: opts.method, ...(opts.body ? { body: JSON.parse(opts.body) } : {}) });
          return { ok: true, status: 200, text: async () => JSON.stringify(result) };
        }
      } };
    },
  });
  vm.runInContext(code, context);
  // Normalize only the fixture transport's default GET option, not production results.
  const api = injected ? context.module.exports.createGithubOperations(
    (endpoint, opts = {}) => request(endpoint, { method: opts.method || "GET", ...(opts.body ? { body: opts.body } : {}) }),
  ) : context.module.exports;
  let result;
  try { result = { value: await api[operation](...args) }; }
  catch (error) { result = { error: error.message }; }
  return JSON.parse(JSON.stringify({ trace, result }));
}
let transactions = 0;
for (const operation of ["pushCodebase", "pushCodebaseWithDeletions"]) {
  for (const files of [[], [{ path: "text", content: "text\n✓" }, { path: "binary", content: "AP8=", encoding: "base64" }]]) {
    const args = ["owner", "repo", files, ...(operation.endsWith("Deletions") ? [["gone"]] : []), "message"];
    for (const options of [{}, ...Array.from({ length: 7 }, (_, failAt) => ({ failAt })),
      { failAt: 2, error: "413 payload too large" }, { emptyAt: 2 }, { emptyAt: 0 }, { emptyAt: 4 }, { emptyAt: 5 }]) {
      const expected = await transaction(oldGithub, operation, args, options);
      assert.deepEqual(await transaction(newGithub, operation, args, options), expected);
      assert.deepEqual(await transaction(newGithub, operation, args, options, true), expected);
      transactions++;
    }
  }
}
for (const [operation, args] of [
  ["getRepoTree", ["owner", "repo"]], ["getRepoTreeAtCommit", ["owner", "repo", "head"]],
  ["getFileContent", ["owner", "repo", "text"]], ["getFileContentAtCommit", ["owner", "repo", "text", "head"]],
  ["getAuthenticatedUser", []], ["getRepository", ["owner", "repo"]],
  ["createRepository", ["name"]], ["listRepositories", []],
]) {
  for (const options of [{}, { failAt: 0, error: "404 missing" }, { emptyAt: 0 }]) {
    const expected = await transaction(oldGithub, operation, args, options);
    assert.deepEqual(await transaction(newGithub, operation, args, options), expected);
    assert.deepEqual(await transaction(newGithub, operation, args, options, true), expected);
    transactions++;
  }
}
console.log(`PASS: ${transactions} GitHub transport transactions; exact ordered calls, results, errors and encoded bodies.`);
for (const response of [
  { status: 502, text: "<html>synthetic gateway failure</html>" },
  { status: 403, text: '{"message":"synthetic denial"}' },
  { status: 500, text: '{}' },
  { status: 200, text: "" },
]) {
  assert.deepEqual(await transaction(newGithub, "getAuthenticatedUser", [], { response }),
    await transaction(oldGithub, "getAuthenticatedUser", [], { response }));
}
console.log("PASS: unchanged transport parsing/error messages for non-JSON, empty and HTTP errors.");

// Pure plan contract: encoded bytes, duplicate paths, order, no input mutation.
const planCode = (await build({
  entryPoints: ["server/sync-plan.ts"], bundle: true, write: false,
  platform: "node", format: "cjs",
})).outputFiles[0].text;
const crypto = await import("node:crypto");
const planExports = {};
const planModule = { exports: planExports };
vm.runInNewContext(planCode, {
  exports: planExports, module: planModule, Buffer,
  require(name) { assert.equal(name, "crypto"); return crypto; },
});
const { planTreeDiff, computeGitBlobSha } = planModule.exports;
const local = [
  { path: "binary", content: "AP8=", encoding: "base64" },
  { path: "unicode", content: "✓\n" },
  { path: "added", content: "" },
];
const remote = [
  { path: "binary", sha: computeGitBlobSha(Buffer.from([0, 255])) },
  { path: "gone-first", sha: "old" },
  { path: "unicode", sha: "old" },
  { path: "gone-last", sha: "old" },
  { path: "gone-first", sha: "new" },
];
const before = JSON.stringify({ local, remote });
assert.deepEqual(JSON.parse(JSON.stringify(planTreeDiff(local, remote))), {
  changedFiles: local.slice(1), deletionCandidates: ["gone-first", "gone-last"],
});
assert.equal(JSON.stringify({ local, remote }), before);
assert.equal(computeGitBlobSha(Buffer.alloc(0)), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
console.log("PASS: pure diff byte encoding, order, duplicate-path and nonmutation checks.");
