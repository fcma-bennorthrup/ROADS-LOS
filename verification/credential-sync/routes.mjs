// Run from an isolated source copy. Only synthetic in-memory files reach routes.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { AsyncLocalStorage } from "node:async_hooks";
import * as net from "node:net";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const directRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const baseline = directRun ? process.argv[2] : null;
const fakeModules = ["github", "storage", "sync-state", "pending-conflicts"];
export async function compile(source) {
  return (await build({
    stdin: { contents: source, resolveDir: path.join(root, "server"), loader: "ts" },
    bundle: true, write: false, platform: "node", format: "cjs",
    plugins: [{
      name: "fake-transports",
      setup(builder) {
        builder.onResolve({ filter: /^\.\/(github|storage|sync-state|pending-conflicts)$/ },
          ({ path: name }) => ({ path: `fake:${name.slice(2)}`, external: true }));
      },
    }],
  })).outputFiles[0].text;
}
const candidateCode = await compile(readFileSync("server/routes.ts", "utf8"));
const baselineCode = baseline ? await compile(readFileSync(baseline, "utf8")) : null;
const plain = (value) => JSON.parse(JSON.stringify(value));
const blobSha = (value) => crypto.createHash("sha1")
  .update(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(value)}\0`), Buffer.from(value)])).digest("hex");
const tree = (files) => Object.entries(files).map(([name, value]) => ({
  path: name, type: "blob", sha: blobSha(value),
}));
const deniedNames = [
  ".env", ".env.local", ".env.example", "cert.pem", "private.key",
  "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
  "github-sync-state.json", "pending-conflicts.json",
];
const deniedPaths = deniedNames.flatMap((name) => [name, `nested/${name}`, `nested/deep/${name}`]);
const safe = { ".gitignore": "safe", ".npmrc": "safe", ".nvmrc": "safe", ".envrc": "safe",
  "id_rsa.pub": "safe", "source.ts": "old", "nested/.safe-config": "safe",
  ".environment": "safe", ".ENV": "case-sensitive-safe", "notes.keynote": "safe",
  "image.png": "synthetic-binary-bytes" };
const errorMessage = "Pending conflicts contain files excluded by the sync security policy. Cancel these conflicts, then retry the sync.";

export async function run(code, scenario, polluted = false) {
  const defaults = scenario.empty ? {} : safe;
  const local = { ...defaults, ...scenario.local };
  const remote = { ...defaults, ...scenario.remote };
  const base = { ...defaults, ...scenario.base };
  for (const name of scenario.removeLocal ?? []) delete local[name];
  for (const name of scenario.removeRemote ?? []) delete remote[name];
  for (const name of scenario.removeBase ?? []) delete base[name];
  if (polluted) {
    for (const [i, name] of deniedPaths.entries()) {
      // Mix existing, local-only, remote-only, and deleted-remote paths.
      if (i % 4 !== 2) local[name] = "DUMMY_LOCAL";
      if (i % 4 !== 3) remote[name] = "DUMMY_REMOTE";
      base[name] = "DUMMY_BASE";
    }
  }
  const originalDenied = Object.fromEntries(Object.entries(local).filter(([name]) => deniedPaths.includes(name)));
  let last = scenario.last === undefined ? "base" : scenario.last;
  let pending = scenario.pending ? plain(scenario.pending) : null;
  if (pending && scenario.decoratePending) {
    pending.localHashes = Object.fromEntries([...new Set([
      ...pending.conflicts.map(f => f.path), ...pending.safeToUpdate.map(f => f.path),
      ...(pending.safeToDelete ?? []),
    ])].sort().map(name => [name, name in local ? blobSha(local[name]) : null]));
  }
  const trace = [];
  let journalWrites = 0;
  let journalRenames = 0;
  const key = (name) => path.posix.relative("/fixture", String(name));
  const files = {
    realpathSync(name) { return name; },
    readdirSync(dir) {
      const prefix = key(dir) ? `${key(dir)}/` : "";
      trace.push(["list", key(dir)]);
      const entries = new Map();
      for (const name of Object.keys(local).sort()) {
        if (!name.startsWith(prefix)) continue;
        const [child, ...rest] = name.slice(prefix.length).split("/");
        entries.set(child, rest.length > 0);
      }
      return [...entries].map(([name, directory]) => ({
        name, isDirectory: () => directory && !scenario.symlinks?.includes(prefix + name),
        isFile: () => !directory && !scenario.symlinks?.includes(prefix + name),
      }));
    },
    lstatSync(name) {
      const relative = key(name);
      trace.push(["lstat", relative]);
      if (scenario.symlinks?.includes(relative)) return { isSymbolicLink: () => true };
      if (!(relative in local) && !Object.keys(local).some((p) => p.startsWith(`${relative}/`)))
        throw Object.assign(new Error("synthetic absent file"), { code: "ENOENT" });
      return { isSymbolicLink: () => false };
    },
    statSync(name) {
      trace.push(["stat", key(name)]);
      if (scenario.failRead === key(name)) throw new Error("synthetic read failure");
      if (!(key(name) in local)) throw Object.assign(new Error("synthetic absent file"), { code: "ENOENT" });
      return { size: scenario.sizes?.[key(name)] ?? Buffer.byteLength(local[key(name)]), isFile: () => true };
    },
    existsSync(name) {
      trace.push(["exists", key(name)]);
      return key(name) === "" || key(name) in local
        || Object.keys(local).some((p) => p.startsWith(`${key(name)}/`));
    },
    readFileSync(name, encoding) {
      trace.push(["read", key(name), encoding ?? null]);
      assert.ok(key(name) in local, "Only fixture files may be read");
      return encoding ? local[key(name)] : Buffer.from(local[key(name)]);
    },
    writeFileSync(name, content, encoding) {
      trace.push(["write", key(name), String(content), encoding ?? null]);
      scenario.onWrite?.({ name: key(name), content, local });
      if (key(name) === ".local/github-sync-recovery.json.tmp" &&
          ++journalWrites === scenario.failJournalWrite) {
        local[key(name)] = '{"torn":';
        throw new Error("synthetic interrupted journal write");
      }
      if (scenario.partialWrite === key(name)) {
        local[key(name)] = String(content).slice(0, 1);
        throw new Error("synthetic partial file write");
      }
      if (scenario.failWrite === key(name)) throw new Error("synthetic write failure");
      local[key(name)] = Buffer.isBuffer(content) ? Buffer.from(content) : String(content);
    },
    mkdirSync(name) {
      trace.push(["mkdir", key(name)]);
      if (scenario.failMkdir === key(name)) throw new Error("synthetic mkdir failure");
    },
    renameSync(from, to) {
      trace.push(["rename", key(from), key(to)]);
      if (++journalRenames === scenario.failJournalRename) throw new Error("synthetic journal rename failure");
      local[key(to)] = local[key(from)];
      delete local[key(from)];
    },
    unlinkSync(name) {
      trace.push(["unlink", key(name)]);
      if (scenario.failDelete === key(name)) throw new Error("synthetic delete failure");
      delete local[key(name)];
    },
  };
  const github = {
    async getAuthenticatedUser() { trace.push(["user"]); return { login: "synthetic-user" }; },
    async getRepository(owner, repo) { trace.push(["repo", owner, repo]); return { name: repo }; },
    async createRepository(name, options) { trace.push(["create-repo", name, options]); return { name }; },
    async getRepoTree() {
      trace.push(["head-tree"]);
      const change = await scenario.onTree?.({ local, remote, trace });
      if (scenario.failHead) throw new Error("synthetic head failure");
      return { commitSha: change?.head ?? scenario.head ?? "head", tree: tree(remote).map((item) => ({
        ...item, size: scenario.remoteSizes?.[item.path] ?? Buffer.byteLength(remote[item.path]),
      })) };
    },
    async getRepoTreeAtCommit(_owner, _repo, ref) {
      trace.push(["base-tree", ref]);
      if (scenario.failBase) throw new Error("synthetic base failure");
      return { tree: tree(base) };
    },
    async getFileContent(_owner, _repo, name, _ref, encoding = "utf-8") {
      trace.push(["head-content", name]);
      const change = await scenario.onContent?.({ local, remote, name, ref: _ref, trace });
      if (scenario.fetchErrors?.[name]) throw new Error(scenario.fetchErrors[name]);
      const value = change?.content ?? scenario.remoteAtFetch?.[name] ?? remote[name];
      return scenario.nullFetch === name || value === undefined ? null : Buffer.from(value).toString(encoding);
    },
    async getFileContentAtCommit(_owner, _repo, name, ref, encoding = "utf-8") {
      trace.push(["base-content", name, ref]);
      if (scenario.baseFetchError === name) throw new Error("synthetic base read failure");
      return base[name] === undefined ? null : Buffer.from(base[name]).toString(encoding);
    },
    async pushCodebaseWithDeletions(_owner, _repo, updates, deletions, message) {
      trace.push(["push", plain(updates), plain(deletions), message]);
      if (scenario.failPush) throw new Error("synthetic push failure");
      return { commitSha: "pushed", filesCount: updates.length };
    },
    async githubRequest() {
      trace.push(["ref"]);
      const change = await scenario.onRef?.({ local, remote, trace });
      return { object: { sha: change?.head ?? scenario.head ?? "head" } };
    },
    async pushCodebase() { throw new Error("Unexpected legacy push"); },
  };
  const modules = {
    github,
    storage: { storage: {} },
    "sync-state": {
      getLastSyncedCommit() { trace.push(["get-last"]); return last; },
      setLastSyncedCommit(value) {
        trace.push(["set-last", value]);
        if (scenario.failCheckpoint) throw new Error("synthetic checkpoint failure");
        last = value;
      },
    },
    "pending-conflicts": {
      getPendingConflicts() { trace.push(["get-pending"]); return pending; },
      setPendingConflicts(value) {
        trace.push(["set-pending", plain(value)]);
        if (scenario.failPending) throw new Error("synthetic pending save failure");
        pending = plain(value);
      },
      clearPendingConflicts() {
        trace.push(["clear-pending"]);
        if (scenario.failClear) throw new Error("synthetic pending clear failure");
        pending = null;
      },
    },
  };
  const handlers = new Map();
  const app = Object.fromEntries(["get", "post", "delete"].map((method) => [
    method, (url, handler) => handlers.set(`${method} ${url}`, handler),
  ]));
  const exports = {};
  const context = vm.createContext({
    exports, module: { exports }, Buffer,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ["2026-10-14T16:00:00Z"])); } static now() { return 1791993600000; } },
    process: { cwd: () => "/fixture", platform: "linux" },
    console: { warn() {}, error() {} },
    require(name) {
      if (name.startsWith("fake:") && fakeModules.includes(name.slice(5))) return modules[name.slice(5)];
      if (name === "fs") return files;
      if (name === "path" || name === "node:path") return path;
      if (name === "node:async_hooks") return { AsyncLocalStorage };
      if (name === "node:net") return net;
      if (name === "crypto") return crypto;
      if (name === "http") return {};
      throw new Error(`Forbidden module: ${name}`);
    },
  });
  vm.runInContext(code, context);
  const register = scenario.injected
    ? context.module.exports.createSyncRouteRegistrar({
        filesystem: files, github, checkpoint: modules["sync-state"],
        conflicts: modules["pending-conflicts"], cwd: () => "/fixture",
        clock: context.Date,
      })
    : context.module.exports.registerRoutes;
  await register({}, app);
  const responses = [];
  async function invoke(request) {
    let status = 200;
    let bytes;
    const res = {
      get statusCode() { return status; },
      status(value) { status = value; return res; },
      json(value) { bytes = JSON.stringify(value); return res; },
    };
    let body = request[1];
    if (scenario.autoPlan && request[0] === "post /api/github/resolve-conflicts") {
      const record = local[".local/github-sync-recovery.json"] && JSON.parse(local[".local/github-sync-recovery.json"]);
      const current = record?.pendingFile
        ? JSON.parse(local[`.local/github-sync-conflicts/${record.pendingFile}.json`]) : pending;
      body = { ...body, planId: current && blobSha(JSON.stringify(current)) };
    }
    await handlers.get(request[0])({ body }, res);
    return { status, bytes };
  }
  await scenario.onRegistered?.({ invoke, local, trace });
  for (const request of scenario.requests ?? [[scenario.route, scenario.body ?? {}]]) {
    responses.push(await invoke(request));
  }
  if (polluted) {
    assert.deepEqual(Object.fromEntries(Object.entries(local).filter(([name]) => deniedPaths.includes(name))), originalDenied);
    assert.ok(!JSON.stringify(trace).includes("DUMMY"), "Excluded contents must never enter adapter calls");
    for (const name of deniedPaths) delete local[name];
    // Ignore enumeration of a directory containing only excluded files.
    for (let i = trace.length - 1; i >= 0; i--) {
      if (trace[i][0] === "list" && trace[i][1] === "nested/deep") trace.splice(i, 1);
    }
  }
  return plain({ responses, trace, local, last, pending });
}

if (directRun) {
const scenarios = [
  { name: "status", route: "get /api/github/sync-status", head: "base" },
  { name: "status-cache", requests: [["get /api/github/sync-status"], ["get /api/github/sync-status"]], head: "base" },
  { name: "initial-push", route: "post /api/github/push", last: null, local: { "source.ts": "new" } },
  { name: "safe-names-push", route: "post /api/github/push", last: null,
    local: Object.fromEntries(Object.keys(safe).map((name) => [name, "safe updated"])) },
  { name: "force-push", route: "post /api/github/push", body: { force: true }, local: { "source.ts": "new" }, removeLocal: [".nvmrc"] },
  { name: "same-head-push", route: "post /api/github/push", head: "base", local: { "source.ts": "new" } },
  { name: "unchanged-push", route: "post /api/github/push", head: "base" },
  { name: "fallback-push", route: "post /api/github/push", head: "base", failBase: true },
  { name: "advanced-push", route: "post /api/github/push", local: { "source.ts": "new" }, removeLocal: [".nvmrc"] },
  { name: "push-conflict", route: "post /api/github/push", local: { "source.ts": "ours" }, remote: { "source.ts": "theirs" } },
  { name: "initial-pull", route: "post /api/github/pull", last: null, remote: { "source.ts": "new" } },
  { name: "force-pull", route: "post /api/github/pull", body: { force: true }, remote: { "source.ts": "new" } },
  { name: "unchanged-pull", route: "post /api/github/pull", head: "base" },
  { name: "advanced-pull-delete", route: "post /api/github/pull", remote: { "source.ts": "new" }, removeRemote: [".nvmrc"] },
  { name: "pull-conflict", route: "post /api/github/pull", local: { "source.ts": "ours" }, remote: { "source.ts": "theirs" } },
  { name: "pull-write-failure", route: "post /api/github/pull", remote: { "source.ts": "new" }, failWrite: "source.ts" },
  { name: "pull-base-failure", route: "post /api/github/pull", failBase: true },
];
let checks = 0;
for (const scenario of scenarios) {
  const clean = await run(candidateCode, scenario);
  if (scenario.name === "safe-names-push") {
    const push = clean.trace.find((call) => call[0] === "push");
    assert.ok(push, "Safe files still push");
    assert.deepEqual(push[1].map((file) => file.path).sort(), Object.keys(safe).sort());
    assert.equal(push[1].find((file) => file.path === "image.png").encoding, "base64");
  }
  if (scenario.name === "initial-pull") {
    assert.equal(JSON.parse(clean.responses[0].bytes).filesUpdated, Object.keys(safe).length - 1);
    assert.equal(clean.local["source.ts"], "new");
  }
  assert.deepEqual(await run(candidateCode, scenario, true), clean, `${scenario.name}: excluded files change no eligible outcome`);
  checks++;
  if (baselineCode) {
    assert.deepEqual(clean, await run(baselineCode, scenario), `${scenario.name}: unaffected baseline equivalence`);
    checks++;
  }
}
const pending = {
  operation: "push", conflicts: [{ path: "source.ts", localContent: "ours", remoteContent: "theirs", baseContent: "old", reason: "synthetic conflict" }],
  safeToUpdate: [], safeToDelete: [], remoteHeadSha: "head", createdAt: "2026-10-14T16:00:00.000Z",
};
for (const operation of ["push", "pull"]) {
  for (const name of deniedPaths) {
    for (const field of ["conflicts", "safeToUpdate", "safeToDelete"]) {
      const plan = plain({ ...pending, operation });
      if (field === "safeToDelete") plan[field].push(name);
      else plan[field].push({ path: name, content: "DUMMY", localContent: "DUMMY", remoteContent: "DUMMY" });
      const result = await run(candidateCode, { pending: plan, requests: [
        ["get /api/github/conflicts"],
        ["post /api/github/resolve-conflicts", { resolutions: [{ path: "source.ts", resolvedContent: "resolved" }] }],
        ["delete /api/github/conflicts"],
        ["get /api/github/conflicts"],
      ] });
      assert.deepEqual(result.responses, [
        { status: 200, bytes: JSON.stringify({ hasConflicts: true, conflicts: [], operation, blockedReason: errorMessage }) },
        { status: 409, bytes: JSON.stringify({ error: errorMessage }) },
        { status: 200, bytes: JSON.stringify({ message: "Pending conflicts cleared" }) },
        { status: 200, bytes: JSON.stringify({ hasConflicts: false, conflicts: [], operation: null }) },
      ]);
      assert.deepEqual(result.trace, [["get-pending"], ["get-pending"], ["clear-pending"], ["get-pending"]]);
      assert.equal(result.local["source.ts"], "old");
      checks++;
    }
  }
  const scenario = { pending: { ...pending, operation }, requests: [
    ["get /api/github/conflicts"],
    ["post /api/github/resolve-conflicts", { resolutions: [{ path: "source.ts", resolvedContent: "resolved" }] }],
  ] };
  const result = await run(candidateCode, scenario);
  assert.equal(result.local["source.ts"], "resolved");
  if (baselineCode) assert.deepEqual(result, await run(baselineCode, scenario));
  checks++;
}
console.log(`PASS: ${checks} route checks; fake filesystem and transport only; baseline comparison ${baselineCode ? "enabled" : "not requested"}.`);
}
