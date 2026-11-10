import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { newLoanApplication } from "../../shared/loan-factory";
import { allocateCif } from "../sf-opportunity";

// No public fallback in search_path: missing fixture tables must fail, not touch
// prototype records. All clients (including the route's own Pool) use this schema.
const schema = `cif_integration_${randomUUID().replaceAll("-", "")}`;
const pools: pg.Pool[] = [];
let db: pg.Pool;
let createdSchema = false;
let create: (req: Request, res: Response) => Promise<void>;
const seed = newLoanApplication({
  id: "1", loanNumber: "123456789", source: "blank", borrowerCount: 2,
});
seed.loan.cifNumber = "999999";

async function request() {
  const result = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  await create({ body: { source: "sf" } } as Request, result as unknown as Response);
  return result;
}

async function waitForBlockedCreations(count: number) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const result = await db.query(
      `SELECT count(*)::int AS count FROM pg_locks l
       JOIN pg_stat_activity a ON a.pid=l.pid
       WHERE a.application_name=$1 AND l.locktype='advisory'
         AND l.objid=784219 AND NOT l.granted`, [schema],
    );
    if (result.rows[0].count === count) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Expected ${count} real PostgreSQL advisory-lock waiters`);
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("PostgreSQL integration requires DATABASE_URL; it does not silently skip.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Run the PostgreSQL regression only against a development/test database.");
  }
  const options = {
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema} -c statement_timeout=12000 -c lock_timeout=10000`,
    application_name: schema,
    connectionTimeoutMillis: 5_000,
    max: 8,
  };
  db = new pg.Pool(options);
  pools.push(db);
  await db.query(`CREATE SCHEMA "${schema}"`);
  createdSchema = true;
  await db.query(`CREATE TABLE prototype_loan_applications (
    loan_id text PRIMARY KEY, document jsonb NOT NULL
  )`);

  // Substitute only connection configuration, never query/transaction behavior.
  vi.doMock("pg", () => ({
    default: { ...pg, Pool: class extends pg.Pool {
      constructor() { super(options); pools.push(this); }
    } },
  }));
  // Force collisions and wrap on every request, while exercising the real
  // allocator. Random starts would almost always hide a stale CIF snapshot.
  vi.doMock("../sf-opportunity", async () => ({
    ...await vi.importActual<typeof import("../sf-opportunity")>("../sf-opportunity"),
    allocateCif: (used: Set<string>) => allocateCif(used, 999999),
  }));
  const { registerLoanApplicationRoutes } = await import("../loan-application");
  registerLoanApplicationRoutes({
    get() {}, put() {},
    post(path: string, handler: typeof create) {
      if (path === "/api/loans") create = handler;
    },
  } as unknown as Express);
});

beforeEach(async () => {
  await db.query("DELETE FROM prototype_loan_applications");
  await db.query("INSERT INTO prototype_loan_applications VALUES ($1,$2)", ["1", JSON.stringify(seed)]);
});

afterAll(async () => {
  try {
    // Close route pools before removing the schema, even after assertion failure.
    await Promise.all(pools.filter(pool => pool !== db).map(pool => pool.end()));
    if (createdSchema) await db.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    if (db) await db.end();
    vi.doUnmock("pg");
    vi.doUnmock("../sf-opportunity");
  }
});

describe("PostgreSQL opportunity creation", () => {
  it("queues separate transactions and commits distinct CIFs and loan numbers", async () => {
    const blocker = await db.connect();
    let pending: Promise<Awaited<ReturnType<typeof request>>[]> | undefined;
    try {
      await blocker.query("BEGIN");
      await blocker.query("SELECT pg_advisory_xact_lock(784219)");
      pending = Promise.all(Array.from({ length: 4 }, () => request()));
      // This is a database-observed barrier, not a sleep or simulated JS mutex.
      await waitForBlockedCreations(4);
      expect((await db.query("SELECT count(*)::int AS count FROM prototype_loan_applications")).rows[0].count).toBe(1);
      await blocker.query("COMMIT");
      const responses = await pending;
      expect(responses.map(r => r.statusCode)).toEqual([201, 201, 201, 201]);
      expect(new Set(responses.map(r => r.body.id)).size).toBe(4);
      expect(responses.map(r => r.body.loanNumber).sort()).toEqual([
        "123456790", "123456791", "123456792", "123456793",
      ]);
      const saved = await db.query("SELECT loan_id, document FROM prototype_loan_applications WHERE loan_id <> '1'");
      expect(saved.rows).toHaveLength(4);
      const cifs = saved.rows.map(row => row.document.loan.cifNumber).sort();
      expect(cifs).toEqual(["100000", "100001", "100002", "100003"]);
      for (const row of saved.rows) {
        expect(row.document.loan.cifNumber).toMatch(/^[1-9]\d{5}$/);
        expect(responses.some(r => r.body.id === row.loan_id &&
          r.body.loanNumber === row.document.loan.loanNumber)).toBe(true);
      }
      expect((await db.query("SELECT document FROM prototype_loan_applications WHERE loan_id='1'")).rows[0].document).toEqual(seed);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      // Drain requests before fixture cleanup, including when the barrier fails.
      await pending;
    }
  });

  it("rolls back a failed write, releases the lock, and allows a clean retry", async () => {
    const before = (await db.query("SELECT loan_id, document FROM prototype_loan_applications ORDER BY loan_id")).rows;
    await db.query("CREATE TABLE rollback_probe (loan_id text)");
    await db.query(`CREATE FUNCTION fail_creation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO rollback_probe VALUES (NEW.loan_id);
        RAISE EXCEPTION 'Deliberate integration failure after insert';
        RETURN NEW;
      END $$`);
    await db.query(`CREATE TRIGGER fail_creation AFTER INSERT ON prototype_loan_applications
      FOR EACH ROW EXECUTE FUNCTION fail_creation()`);
    try {
      const failed = await request();
      expect(failed.statusCode).toBe(503);
      expect(failed.body).toEqual({ error: "The loan could not be created. No success was confirmed." });
      expect((await db.query("SELECT loan_id, document FROM prototype_loan_applications ORDER BY loan_id")).rows).toEqual(before);
      expect((await db.query("SELECT * FROM rollback_probe")).rows).toEqual([]);
      // An omitted ROLLBACK leaves a pooled client idle in an aborted transaction.
      expect((await db.query(`SELECT pid FROM pg_stat_activity
        WHERE application_name=$1 AND state LIKE 'idle in transaction%'`, [schema])).rows).toEqual([]);
      expect((await db.query(`SELECT l.pid FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid
        WHERE a.application_name=$1 AND l.locktype='advisory'`, [schema])).rows).toEqual([]);
    } finally {
      await db.query("DROP TRIGGER fail_creation ON prototype_loan_applications");
    }
    const retried = await request();
    expect(retried.statusCode).toBe(201);
    expect(retried.body.loanNumber).toBe("123456790");
    const saved = await db.query("SELECT document FROM prototype_loan_applications WHERE loan_id=$1", [retried.body.id]);
    expect(saved.rows[0].document.loan.cifNumber).toBe("100000");
    expect((await db.query("SELECT count(*)::int AS count FROM prototype_loan_applications")).rows[0].count).toBe(before.length + 1);
  });
});
