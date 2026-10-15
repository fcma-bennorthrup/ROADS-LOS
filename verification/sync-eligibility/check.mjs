import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import vm from "node:vm";
import { compile, run } from "../credential-sync/routes.mjs";

const candidate = await compile(readFileSync("server/routes.ts", "utf8"));
const baselineRoot = process.argv[2];
// Bundle the baseline using its own helper files, not the candidate's helpers.
const baseline = (await build({
  entryPoints: [path.join(baselineRoot, "server/routes.ts")], bundle: true,
  write: false, platform: "node", format: "cjs",
  plugins: [{ name: "fake", setup(builder) {
    builder.onResolve({ filter: /^\.\/(github|storage|sync-state|pending-conflicts)$/ },
      ({ path: name }) => ({ path: `fake:${name.slice(2)}`, external: true }));
  } }],
})).outputFiles[0].text;
const bytes = (value) => value?.type === "Buffer" ? Buffer.from(value.data) : Buffer.from(value ?? "");
const response = (result) => JSON.parse(result.responses[0].bytes);
const push = (result) => result.trace.find((call) => call[0] === "push");
const writes = (result) => result.trace.filter((call) => ["write", "unlink", "push", "set-last", "set-pending", "clear-pending"].includes(call[0]));
const MAX = 7 * 1024 * 1024;
let count = 0;
async function scenario(options) {
  count++;
  return run(candidate, { empty: true, ...options });
}
const pdf = Buffer.from([0x25,0x50,0x44,0x46,0xff,0x80,0,13,10]);
const edited = Buffer.concat([pdf, Buffer.from("edited")]);
const other = Buffer.concat([pdf, Buffer.from("other")]);
for (const op of ["push", "pull"]) {
  for (const force of [false, true]) {
    const result = await scenario({ route: `post /api/github/${op}`, body: { force },
      symlinks: ["linked"], local: { "linked/external.txt": "EXTERNAL_BYTES_MUST_NOT_BE_READ" },
      remote: { "linked/external.txt": "remote" }, base: { "linked/external.txt": "base" } });
    assert.ok(!result.trace.some((call) => ["read", "stat", "write", "unlink"].includes(call[0]) && call[1] === "linked/external.txt"));
    assert.ok(!JSON.stringify(result.trace).includes("EXTERNAL_BYTES_MUST_NOT_BE_READ"));
    assert.ok(!push(result)?.[2].includes("linked/external.txt"));
  }
}

// Add/edit/unchanged/delete/both-side matrix for text and exact binary bytes.
for (const [name, original, updated, theirs] of [
  ["source.ts", "old\n✓", "new\n✓", "remote\n✓"],
  ["document.pdf", pdf, edited, other],
]) {
  for (const operation of ["push", "pull"]) {
    const route = `post /api/github/${operation}`;
    const source = operation === "push" ? "local" : "remote";
    const target = operation === "push" ? "remote" : "local";
    for (const force of [false, true]) {
      for (const mode of ["add", "edit", "unchanged", "delete", "both"]) {
        const opts = { route, body: { force }, local: {}, remote: {}, base: {} };
        if (mode !== "add") {
          opts.local[name] = original; opts.remote[name] = original; opts.base[name] = original;
        }
        if (mode === "add" || mode === "edit") opts[source][name] = updated;
        if (mode === "delete") delete opts[source][name];
        if (mode === "both") { opts.local[name] = updated; opts.remote[name] = theirs; }
        const result = await scenario(opts);
        const body = response(result);
        if (mode === "both" && name.endsWith(".pdf")) {
          assert.equal(result.responses[0].status, 500);
          assert.equal(body.error, "Sync blocked: 1 binary file(s) need manual reconciliation. No files were changed. Reconcile these files outside the text conflict editor, then retry.");
          assert.deepEqual(writes(result), []);
        } else if (["add", "edit"].includes(mode)) {
          assert.equal(result.responses[0].status, 200, body.error);
          if (operation === "pull") assert.deepEqual(bytes(result.local[name]), bytes(updated));
          else {
            const sent = push(result)?.[1].find((f) => f.path === name);
            assert.ok(sent, JSON.stringify(body));
            assert.deepEqual(Buffer.from(sent.content, sent.encoding === "base64" ? "base64" : "utf8"), bytes(updated));
          }
        } else if (mode === "delete" && name.endsWith(".pdf")) {
          assert.ok(!result.trace.some((call) => call[0] === "unlink"));
          assert.ok(!push(result)?.[2].includes(name));
          if (operation === "pull") assert.deepEqual(bytes(result.local[name]), pdf);
        } else if (mode === "delete") {
          if (operation === "push") assert.ok(push(result)?.[2].includes(name));
          else if (!force) assert.ok(!(name in result.local));
          else assert.equal(result.local[name], original); // Existing force-pull no-delete contract.
        } else if (mode === "unchanged" && operation === "push") {
          assert.ok(!push(result));
        }
      }
    }
    for (const last of [null, "base"]) {
      const result = await scenario({ route, last, failBase: !!last, body: { force: true },
        local: { [name]: original }, remote: { [name]: updated } });
      if (name.endsWith(".pdf")) {
        assert.match(response(result).error, /binary file/);
        assert.deepEqual(writes(result), []);
      }
    }
    // Actual raw byte limits on either side; metadata is not the sole gate.
    for (const length of [MAX - 1, MAX, MAX + 1]) {
      const data = Buffer.alloc(length, name.endsWith(".pdf") ? 0xff : 0x61);
      const result = await scenario({ route, last: null, [source]: { [name]: data } });
      assert.equal(result.responses[0].status, 200, response(result).error);
      if (length > MAX) {
        assert.match(response(result).message, /Skipped 1 file\(s\) larger than 7 MiB; existing copies were preserved\./);
        assert.ok(!push(result)?.[1].some((f) => f.path === name));
        assert.ok(!(name in result.local) || source === "local");
      } else if (operation === "pull") assert.deepEqual(bytes(result.local[name]), data);
      else {
        const sent = push(result)[1][0];
        assert.deepEqual(Buffer.from(sent.content, sent.encoding === "base64" ? "base64" : "utf8"), data);
      }
    }
    for (const failure of [{ failRead: name }, { nullFetch: name },
      { fetchErrors: { [name]: "404 missing despite listed tree" } }, { baseFetchError: name }]) {
      const result = await scenario({ route, local: { [name]: original },
        remote: { [name]: original }, base: { [name]: original }, ...failure });
      assert.equal(response(result).error, "Sync blocked: could not read 1 file(s). No files were changed. Fix the read errors and retry.");
      assert.deepEqual(writes(result), []);
    }
    // A large counterpart protects a small destination from overwrite/deletion.
    for (const side of ["local", "remote", "base"]) {
      const result = await scenario({ route, local: { [name]: original },
        remote: { [name]: updated }, base: { [name]: original }, [side]: { [name]: Buffer.alloc(MAX + 1, 97) } });
      assert.match(response(result).message, /Skipped 1 file/);
      assert.ok(!push(result)?.[1].length);
      assert.ok(!result.trace.some((call) => call[0] === "write" || call[0] === "unlink"));
    }
  }
}

// Same-head status counts do not infer binary/oversized/unreadable deletion.
for (const name of ["document.pdf", "source.ts"]) {
  let result = await scenario({ route: "get /api/github/sync-status", head: "base", base: { [name]: "old" } });
  assert.equal(response(result).localDeletedCount, name.endsWith(".pdf") ? 0 : 1);
  result = await scenario({ route: "get /api/github/sync-status", head: "base",
    base: { [name]: "old" }, local: { [name]: "old" }, failRead: name });
  assert.equal(response(result).localCheckFailed, true);
  assert.equal(response(result).inSync, false);
  result = await scenario({ route: "get /api/github/sync-status", head: "base",
    base: { [name]: Buffer.alloc(MAX + 1) } });
  assert.equal(response(result).localDeletedCount, 0);
}

for (const name of [".env", ".env.example", "private.key", "cert.pem", "nested/id_rsa",
  "package-lock.json", "nested/package-lock.json", ".local/safe.txt", "node_modules/safe.txt"]) {
  for (const operation of ["push", "pull"]) {
    const result = await scenario({ route: `post /api/github/${operation}`, body: { force: true },
      local: { [name]: "DUMMY_LOCAL" }, remote: { [name]: "DUMMY_REMOTE" }, base: { [name]: "DUMMY_BASE" } });
    assert.equal(result.local[name], "DUMMY_LOCAL");
    assert.ok(!JSON.stringify(result.trace).includes("DUMMY"));
  }
}

// Old conflict plans: block before writes; retain cancellation behavior.
const pending = { operation: "push", remoteHeadSha: "head", conflicts: [{
  path: "source.ts", localContent: "ours", remoteContent: "theirs", baseContent: "old", reason: "conflict",
}], safeToUpdate: [], safeToDelete: [] };
for (const plan of [
  { ...pending, conflicts: [{ ...pending.conflicts[0], path: "document.pdf" }] },
  { ...pending, safeToDelete: ["document.pdf"] },
  { ...pending, safeToUpdate: [{ path: "package-lock.json", content: "old" }] },
  { ...pending, safeToUpdate: [{ path: "large.txt", content: "a".repeat(MAX + 1) }] },
  { ...pending, safeToUpdate: [{ path: "document.pdf", content: "not encoded" }] },
]) {
  const result = await scenario({ pending: plan, requests: [
    ["get /api/github/conflicts"],
    ["post /api/github/resolve-conflicts", { resolutions: [{ path: "source.ts", resolvedContent: "new" }] }],
    ["delete /api/github/conflicts"],
  ] });
  assert.match(response(result).blockedReason, /incompatible with the sync eligibility policy/);
  assert.equal(result.responses[1].status, 409);
  assert.deepEqual(writes(result), [["clear-pending"]]);
}
// A changed binary saved alongside a text conflict remains transferable with
// a usable unchanged remote baseline (never converted to UTF-8).
const resolved = await scenario({ route: "post /api/github/resolve-conflicts",
  pending: { ...pending, safeToUpdate: [{ path: "document.pdf", content: edited.toString("base64"), encoding: "base64" }] },
  local: { "source.ts": "ours", "document.pdf": edited },
  remote: { "source.ts": "theirs", "document.pdf": pdf },
  base: { "source.ts": "old", "document.pdf": pdf },
  body: { resolutions: [{ path: "source.ts", resolvedContent: "resolved" }] },
});
assert.equal(resolved.responses[0].status, 200, response(resolved).error);
assert.deepEqual(Buffer.from(push(resolved)[1][0].content, "base64"), edited);

// Unaffected text outcomes: exact response bytes, local results, checkpoint,
// pending plan, and ordered mutation calls. Additional preflight reads are
// intentional and checked separately by the failure/no-mutation cases.
for (const opts of [
  { route: "post /api/github/push", local: { "a.txt": "new" }, remote: { "a.txt": "old" }, base: { "a.txt": "old" } },
  { route: "post /api/github/push", head: "base", local: { "a.txt": "old" }, remote: { "a.txt": "old" }, base: { "a.txt": "old" } },
  { route: "post /api/github/pull", local: { "a.txt": "old" }, remote: { "a.txt": "new" }, base: { "a.txt": "old" } },
  ...["push", "pull"].flatMap((op) => [
    { route: `post /api/github/${op}`, local: { "a.txt": "ours" }, remote: { "a.txt": "theirs" }, base: { "a.txt": "old" } },
    { route: `post /api/github/${op}`, body: { force: true }, local: { "a.txt": "ours" }, remote: { "a.txt": "theirs" }, base: { "a.txt": "old" } },
    { route: `post /api/github/${op}`, last: null, local: { "a.txt": "old" }, remote: { "b.txt": "new" } },
    { route: `post /api/github/${op}`, local: op === "push" ? {} : { "a.txt": "old" },
      remote: op === "pull" ? {} : { "a.txt": "old" }, base: { "a.txt": "old" } },
  ]),
  { route: "post /api/github/pull", failWrite: "a.txt", local: { "a.txt": "old" }, remote: { "a.txt": "new" }, base: { "a.txt": "old" } },
]) {
  const actual = await scenario(opts);
  const expected = await run(baseline, { empty: true, ...opts });
  assert.deepEqual(actual.responses, expected.responses);
  assert.deepEqual(actual.local, expected.local);
  assert.equal(actual.last, expected.last);
  assert.deepEqual(actual.pending, expected.pending);
  assert.deepEqual(writes(actual), writes(expected));
}

// Exercise the real GitHub byte decoder against a fake transport, including
// Contents API's >1 MiB response and truly empty files.
const githubCode = (await build({ entryPoints: ["server/github.ts"], bundle: true,
  write: false, platform: "node", format: "cjs", external: ["@replit/connectors-sdk"] })).outputFiles[0].text;
const exports = {};
const context = vm.createContext({ module: { exports }, exports, Buffer, console,
  require(name) { assert.equal(name, "@replit/connectors-sdk"); return { ReplitConnectors: class {} }; },
});
vm.runInContext(githubCode, context);
for (const data of [Buffer.alloc(0), pdf, Buffer.alloc(MAX, 0xff)]) {
  const calls = [];
  const api = context.module.exports.createGithubOperations(async (endpoint) => {
    calls.push(endpoint);
    if (endpoint.includes("/contents/") && data.length > 1024 * 1024)
      return { encoding: "none", sha: "blob" };
    return { encoding: "base64", content: data.toString("base64") };
  });
  assert.deepEqual(Buffer.from(await api.getFileContent("o", "r", "x.pdf", "main", "base64"), "base64"), data);
  assert.deepEqual(Buffer.from(await api.getFileContentAtCommit("o", "r", "x.pdf", "base", "base64"), "base64"), data);
  if (data.length > 1024 * 1024) assert.equal(calls.filter((p) => p.endsWith("/git/blobs/blob")).length, 2);
}
console.log(`PASS: ${count} eligibility scenarios; byte limits, binary hashes/bytes, failures, exclusions, pending plans, and exact unaffected text responses/mutation order.`);
