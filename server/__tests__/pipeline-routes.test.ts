import { beforeEach, describe, expect, it, vi } from "vitest";
import { newLoanApplication } from "../../shared/loan-factory";
const db = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn(), release: vi.fn() }));
vi.mock("pg", () => ({ default: { Pool: class {
  query = db.query;
  connect = db.connect;
} } }));
import { registerLoanApplicationRoutes } from "../loan-application";

const routes: Record<string, (req: any, res: any) => Promise<void>> = {};
registerLoanApplicationRoutes({
  get: (path: string, fn: any) => { routes[`GET ${path}`] = fn; },
  post: (path: string, fn: any) => { routes[`POST ${path}`] = fn; },
  put: (path: string, fn: any) => { routes[`PUT ${path}`] = fn; },
} as any);
function document(id = "1") {
  return newLoanApplication({ id, loanNumber: id === "1" ? "123456789" : "123456790",
    source: "blank", borrowerCount: 2, now: "2026-11-01T00:00:00.000Z" });
}
async function request(route: string, body = {}, id = "1") {
  const result: any = { statusCode: 200, headers: {} };
  result.status = (code: number) => { result.statusCode = code; return result; };
  result.set = (key: string, value: string) => { result.headers[key] = value; return result; };
  result.json = (data: unknown) => { result.body = data; return result; };
  await routes[route]({ body, params: { id } }, result);
  return result;
}
beforeEach(() => {
  vi.resetAllMocks();
  db.connect.mockResolvedValue({ query: db.query, release: db.release });
});
describe("pipeline API", () => {
  it("serializes simultaneous opportunity allocations and preserves both inserts", async () => {
    const saved: any[] = [document()];
    let tail = Promise.resolve();
    db.query.mockImplementation(async () => ({ rows: [{ document: saved[0] }] }));
    db.connect.mockImplementation(async () => {
      let unlock: () => void = () => {};
      return {
        release: vi.fn(),
        query: async (sql: string, args?: any[]) => {
          if (sql.includes("pg_advisory_xact_lock")) {
            const previous = tail;
            tail = new Promise<void>(resolve => { unlock = resolve; });
            await previous;
          } else if (sql.includes("GREATEST")) {
            return { rows: [{ number: String(123456789 + saved.length) }] };
          } else if (sql.includes(" AS cif")) {
            return { rows: saved.map(document => ({ cif: document.loan.cifNumber })) };
          } else if (sql.startsWith("INSERT")) {
            saved.push(JSON.parse(args![1]));
            return { rowCount: 1, rows: [] };
          } else if (sql === "COMMIT" || sql === "ROLLBACK") unlock();
          return { rows: [] };
        },
      };
    });
    const results = await Promise.all([request("POST /api/loans", { source: "sf" }), request("POST /api/loans", { source: "sf" })]);
    expect(results.map(result => result.statusCode)).toEqual([201, 201]);
    expect(saved).toHaveLength(3);
    expect(new Set(saved.slice(1).map(app => app.loan.cifNumber)).size).toBe(2);
    expect(new Set(saved.slice(1).map(app => app.loan.loanNumber)).size).toBe(2);
  });
  it("allocates SF CIFs only after locking and commits the generated document", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ document: document() }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ number: "123456790" }] })
      .mockResolvedValueOnce({ rows: [{ cif: "100000" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const result = await request("POST /api/loans", { source: "sf" });
    expect(result.statusCode).toBe(201);
    expect(db.query.mock.calls[2][0]).toContain("pg_advisory_xact_lock");
    expect(db.query.mock.calls[4][0]).toContain("cifNumber");
    const saved = JSON.parse(db.query.mock.calls[5][1][1]);
    expect(saved.loan.cifNumber).toMatch(/^[1-9]\d{5}$/);
    expect(saved.loan.cifNumber).not.toBe("100000");
    expect(saved.meta.opportunity.queue).toBe("Sales Support");
    expect(db.query.mock.calls[6][0]).toBe("COMMIT");
  });
  it("rejects malformed sections before a database write", async () => {
    const result = await request("PUT /api/loans/:id/application", {
      generation: 0, revision: 0, section: "current-liabilities", value: "invalid",
    });
    expect(result.statusCode).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  it("rejects a newer document format without overwriting its data", async () => {
    const current = document(); current.schemaVersion = 999;
    db.query.mockResolvedValueOnce({ rows: [{ document: current }] });
    const result = await request("PUT /api/loans/:id/stage", { stage: "Decisioning", generation: 0, revision: 0 });
    expect(result.statusCode).toBe(409);
    expect(result.body.error).toContain("does not match this code version");
    expect(db.query).toHaveBeenCalledTimes(1);
  });
  it("lists projections, newest first, without leaking full documents", async () => {
    const a = document(), b = document("other");
    b.meta!.updatedAt = "2026-11-09T00:00:00.000Z";
    db.query.mockResolvedValueOnce({ rows: [{ document: a }] })
      .mockResolvedValueOnce({ rows: [{ loan_id: "1" }, { loan_id: "other" }] })
      .mockResolvedValueOnce({ rows: [{ document: a }] })
      .mockResolvedValueOnce({ rows: [{ document: b }] });
    const result = await request("GET /api/loans");
    expect(result.headers["Cache-Control"]).toBe("no-store");
    expect(result.body.map((row: any) => row.id)).toEqual(["other", "1"]);
    expect(result.body[0]).not.toHaveProperty("sections");
    expect(result.body[0]).not.toHaveProperty("borrowers");
    expect(result.body[0].amountRequested).toBeNull();
  });
  it("allocates a blank package under a transaction lock", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ document: document() }] })
      .mockResolvedValueOnce({ rows: [] }) // begin
      .mockResolvedValueOnce({ rows: [] }) // lock
      .mockResolvedValueOnce({ rows: [{ number: "123456790" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // insert
      .mockResolvedValueOnce({ rows: [] }); // commit
    const result = await request("POST /api/loans", { source: "blank" });
    expect(result.statusCode).toBe(201);
    expect(result.body.loanNumber).toBe("123456790");
    const insert = db.query.mock.calls.find(([sql]) => sql.startsWith("INSERT"));
    const saved = JSON.parse(insert![1][1]);
    expect(saved.mode).toBe("empty");
    expect(saved.sections).toEqual({});
    expect(saved.loan.stage).toBe("Customer Application");
    expect(saved.borrowers[0].id).toBe(`${result.body.id}-primary`);
    expect(db.query.mock.calls.some(([sql]) => sql.includes("pg_advisory_xact_lock"))).toBe(true);
    expect(db.release).toHaveBeenCalledOnce();
  });
  it("rejects unsupported creation and stage values before querying", async () => {
    expect((await request("POST /api/loans", { source: "existing" })).statusCode).toBe(400);
    expect((await request("PUT /api/loans/:id/stage", { stage: "Unknown", generation: 0, revision: 0 })).statusCode).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  it("uses CAS for stage writes and reports stale saves", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ document: document() }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const result = await request("PUT /api/loans/:id/stage", { stage: "Decisioning", generation: 0, revision: 2 });
    expect(result.statusCode).toBe(409);
    const [sql, params] = db.query.mock.calls[1];
    expect(sql).toContain("'{loan,stage}'");
    expect(sql).toContain("'{meta,updatedAt}'");
    expect(sql).toContain("(document->>'generation')::int=$3");
    expect(sql).toContain("(document->>'revision')::int=$4");
    expect(params).toEqual(["1", "Decisioning", 0, 2]);
  });
  it("returns saved stage and leaves unrelated sections unchanged", async () => {
    const current = document();
    current.sections.test = { retained: true };
    const next = structuredClone(current);
    next.loan.stage = "Pre-Approval"; next.revision++;
    db.query.mockResolvedValueOnce({ rows: [{ document: current }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ document: next }] });
    const result = await request("PUT /api/loans/:id/stage", { stage: "Pre-Approval", generation: 0, revision: 0 });
    expect(result.statusCode).toBe(200);
    expect(result.body.sections).toEqual(current.sections);
    expect(result.body.revision).toBe(1);
  });
  it("backfills seed metadata without changing seed stage or stored fields", async () => {
    const seed = document();
    seed.mode = "existing"; seed.loan.stage = "Loan Setup"; delete seed.meta;
    db.query.mockResolvedValueOnce({ rows: [{ document: seed }] })
      .mockImplementationOnce(async (_sql, args) => ({ rows: [{ document: JSON.parse(args[1]) }] }));
    const result = await request("GET /api/loans/:id/application");
    expect(result.body.meta.source).toBe("seed");
    expect(result.body.loan.stage).toBe("Loan Setup");
    expect(result.body.revision).toBe(0);
  });
  it("retains creation time and resets only the target loan on Blend replacement", async () => {
    const current = document("other");
    db.query.mockResolvedValueOnce({ rows: [{ document: current }] })
      .mockImplementationOnce(async (_sql, args) => ({ rowCount: 1, rows: [{ document: JSON.parse(args[1]) }] }));
    const result = await request("POST /api/loans/:id/application/demo", {
      action: "blend", borrowerCount: 1, confirmed: true, generation: 0, revision: 0,
      sections: { "current-liabilities": [], "noncurrent-liabilities": [] },
    }, "other");
    expect(result.body.loan.id).toBe("other");
    expect(result.body.meta.createdAt).toBe(current.meta!.createdAt);
    expect(result.body.meta.source).toBe("blend");
    expect(result.body.borrowers).toHaveLength(1);
    expect(result.body.generation).toBe(1);
  });
  it("returns a clear database error rather than an empty successful list", async () => {
    db.query.mockRejectedValueOnce(new Error("offline"));
    expect((await request("GET /api/loans")).statusCode).toBe(503);
  });
});
