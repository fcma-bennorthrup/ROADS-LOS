import { afterAll, beforeAll, expect, it, vi } from "vitest";
import express from "express";
import pg from "pg";
import type { Server } from "node:http";

// Opt in explicitly: uses the configured database, but all writes are to a
// temporary table in a rolled-back transaction, never a real loan document.
const enabled = process.env.RUN_LOAN_DATABASE_TESTS === "1";
const state = vi.hoisted(() => ({ client: null as any }));
vi.mock("pg", async (importOriginal) => {
  const actual = await importOriginal<typeof import("pg")>();
  return { ...actual, default: { ...actual.default, Pool: class {
    query(...args: any[]) { return state.client.query(...args); }
  } } };
});

let server: Server;
let base: string;
beforeAll(async () => {
  if (!enabled) return;
  state.client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await state.client.connect();
  await state.client.query("BEGIN");
  await state.client.query(`CREATE TEMP TABLE prototype_loan_applications
    (LIKE public.prototype_loan_applications INCLUDING ALL) ON COMMIT DROP`);
  const { registerLoanApplicationRoutes } = await import("../loan-application");
  const app = express();
  app.use(express.json());
  registerLoanApplicationRoutes(app);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  if (state.client) {
    await state.client.query("ROLLBACK");
    await state.client.end();
  }
});

it.skipIf(!enabled)("loads, persists a section, and rejects a stale save without touching real loans", async () => {
  const path = `${base}/api/loans/1/application`;
  const response = await fetch(path);
  expect(response.status).toBe(200);
  const initial = await response.json();
  const payload = { generation: initial.generation, revision: initial.revision,
    section: "verification", value: { saved: true } };
  const save = () => fetch(path, { method: "PUT",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const saved = await save();
  expect(saved.status).toBe(200);
  const reloaded = await (await fetch(path)).json();
  expect(reloaded.sections.verification).toEqual({ saved: true });
  expect(reloaded.revision).toBe(initial.revision + 1);
  expect((await save()).status).toBe(409);
  expect(await (await fetch(path)).json()).toEqual(reloaded);
  expect((await fetch(`${base}/api/loans/not-a-loan/application`)).status).toBe(404);
});
