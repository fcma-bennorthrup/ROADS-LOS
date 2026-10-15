import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import { EventEmitter } from "node:events";

// Executed only in the disposable copy made by run.py. No server startup,
// imports from application modules, live storage, secrets, or transports.
const index = readFileSync("server/index.ts", "utf8");
const routes = readFileSync("server/routes.ts", "utf8");
const baseline = readFileSync("verification/api-logging/baseline-middleware.txt", "utf8");
const candidate = index.slice(index.indexOf("app.use((req, res, next) => {"), index.indexOf("\n(async () => {"));
assert.ok(candidate.startsWith("app.use("));
const logger = index.slice(index.indexOf("export function log("), index.indexOf("app.use((req, res, next) => {")).replace("export ", "");
const registerSource = routes.slice(routes.indexOf("export async function registerRoutes(")).replace("export ", "");

const marker = "DUMMY_SENSITIVE_RESPONSE_MARKER";
const loan = { id: "fixture", amount: "123.45", privateNotes: marker };
const borrowers = [{ name: marker, email: `${marker}@invalid.test` }];
const pending = {
  operation: "pull", remoteHeadSha: marker, commitMessage: marker,
  createdAt: "2026-10-14T16:00:00.000Z",
  conflicts: [{ path: `${marker}.txt`, reason: marker, localContent: marker, remoteContent: marker, baseContent: marker }],
};
const denied = () => { throw new Error("External adapter invocation forbidden"); };

async function request(middleware, scenario, elapsed = 7) {
  const messages = [];
  const calls = [];
  const handlers = new Map();
  let listener;
  let tick = 0;
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : ["2026-10-14T16:00:00.000Z"])); }
    static now() { return 1791993600000 + (tick++ ? elapsed : 0); }
  }
  const context = vm.createContext({
    Date: Clock,
    console: { log: (line) => messages.push(line), error: denied, warn: denied },
    app: {
      use: (fn) => { listener = fn; },
      get: (path, fn) => handlers.set(`GET ${path}`, fn),
      post: (path, fn) => handlers.set(`POST ${path}`, fn),
      delete: (path, fn) => handlers.set(`DELETE ${path}`, fn),
    },
    storage: {
      getLoan: async (id) => {
        calls.push(["getLoan", id]);
        if (scenario === "loan-error") throw new Error(marker);
        return scenario === "loan-missing" ? undefined : loan;
      },
      getBorrowersByLoanId: async (id) => { calls.push(["getBorrowersByLoanId", id]); return borrowers; },
    },
    getPendingConflicts: () => {
      calls.push(["getPendingConflicts"]);
      if (scenario === "conflict-error") throw new Error(marker);
      return scenario === "conflict-empty" ? null : pending;
    },
    // All other dependencies are absent from this VM; an accidental call
    // cannot reach the filesystem, connector, process environment, or network.
  });
  vm.runInContext(stripTypeScriptTypes(`${logger}\n${middleware}\n${registerSource}`), context);
  await vm.runInContext("registerRoutes(null, app)", context);
  const isLoan = scenario.startsWith("loan");
  const path = isLoan ? "/api/loans/fixture" : scenario === "non-api" ? "/loans/fixture" : "/api/github/conflicts";
  const req = { method: "GET", path, params: { id: "fixture" }, query: { note: marker }, headers: { authorization: marker } };
  const res = new EventEmitter();
  res.statusCode = 200;
  res.status = function (status) { this.statusCode = status; return this; };
  let body;
  const originalJson = res.json = function (value) {
    assert.equal(this, res);
    body = JSON.stringify(value);
    return this;
  };
  let nextCount = 0;
  listener(req, res, () => nextCount++);
  assert.equal(nextCount, 1);
  if (middleware === candidate) assert.equal(res.json, originalJson, "must not wrap res.json");
  if (scenario === "conflict-409") res.status(409).json({ error: marker, conflicts: pending.conflicts });
  else if (scenario === "non-api") res.json({ private: marker });
  else if (scenario === "no-json") res.status(204);
  else await handlers.get(isLoan ? "GET /api/loans/:id" : "GET /api/github/conflicts")(req, res);
  assert.deepEqual(messages, [], "logging waits for finish");
  res.emit("finish");
  return { body, status: res.statusCode, calls, messages, path };
}

const expectedStatuses = {
  "loan-success": 200, "loan-missing": 404, "loan-error": 500,
  "conflict-success": 200, "conflict-empty": 200, "conflict-error": 500,
  "conflict-409": 409, "non-api": 200, "no-json": 204,
};
for (const [scenario, status] of Object.entries(expectedStatuses)) {
  test(`${scenario}: exact response bytes/status/adapter order; metadata-only logs`, async () => {
    const before = await request(baseline, scenario);
    const after = await request(candidate, scenario);
    assert.equal(after.status, status);
    assert.equal(after.status, before.status);
    assert.equal(after.body, before.body);
    assert.deepEqual(after.calls, before.calls);
    if (scenario === "non-api") {
      assert.deepEqual(before.messages, []);
      assert.deepEqual(after.messages, []);
    } else {
      assert.equal(after.messages.length, 1);
      assert.equal(after.messages[0], `4:00:00 PM [express] GET ${after.path} ${status} in 7ms`);
      assert.equal(after.messages[0], before.messages[0].split(" :: ")[0]);
      assert.ok(!after.messages.join("").includes(marker));
      if (before.body?.includes(marker)) assert.ok(before.messages.join("").includes(marker), "positive control detects baseline exposure");
    }
    const later = await request(candidate, scenario, 321);
    assert.equal(later.body, after.body);
    assert.equal(later.status, after.status);
    assert.deepEqual(later.calls, after.calls);
    if (scenario !== "non-api") assert.ok(later.messages[0].endsWith("in 321ms"));
  });
}

test("logger itself and all non-logging entrypoint code remain exact", () => {
  // Historical source is reconstructed only for fingerprint comparison, never run.
  const original = index.replace(candidate, baseline);
  // Checked against the source observed before this task's single production edit.
  return import("node:crypto").then(({ createHash }) => {
    assert.equal(createHash("sha256").update(original).digest("hex"),
      "9b0f5a62495c0af6eb24993b8545bbd4043034cb7a2c2c0e8f25fd8ca46648e2");
  });
});
