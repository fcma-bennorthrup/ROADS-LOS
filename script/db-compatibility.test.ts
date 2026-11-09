import { beforeEach, describe, expect, it } from "vitest";
import { applyDevelopmentUpgrades, assertDevelopmentUpgrade, automaticallyUpgradeDevelopment,
  inspectDatabase, readAutomaticApprovals, readUpgrades } from "./db-compatibility";
import { newLoanApplication } from "../shared/loan-factory";
import type { LoanApplication } from "../shared/loan-application";

class FakeDb {
  table = false;
  ledger = false;
  applied: { id: string; checksum: string }[] = [];
  docs: { loan_id: string; document: LoanApplication }[] = [];
  calls: string[] = [];
  extraColumn = false;
  failUpdate = false;
  backup: any;
  async query(sql: string, args: any[] = []): Promise<any> {
    this.calls.push(sql);
    if (sql.startsWith("BEGIN")) this.backup = structuredClone({ table: this.table, ledger: this.ledger, applied: this.applied, docs: this.docs });
    if (sql === "ROLLBACK") Object.assign(this, this.backup);
    if (sql.includes("to_regclass")) return { rows: [{ loans: this.table ? "table" : null, ledger: this.ledger ? "ledger" : null }] };
    if (sql.includes("SELECT id, checksum")) return { rows: structuredClone(this.applied) };
    if (sql.includes("information_schema.columns")) return { rows: [
      { column_name: "loan_id", data_type: "text", is_nullable: "NO" },
      { column_name: "document", data_type: "jsonb", is_nullable: "NO" },
      ...(this.extraColumn ? [{ column_name: "drift", data_type: "text", is_nullable: "YES" }] : []),
    ] };
    if (sql.includes("SELECT a.attname")) return { rows: [{ attname: "loan_id" }] };
    if (sql.startsWith("SELECT loan_id, document")) return { rows: structuredClone(this.docs) };
    if (sql.includes("CREATE TABLE IF NOT EXISTS public.roads_development_upgrades")) this.ledger = true;
    if (sql.includes("CREATE TABLE IF NOT EXISTS public.prototype_loan_applications")) this.table = true;
    if (sql.startsWith("UPDATE public.prototype_loan_applications")) {
      if (this.failUpdate) throw new Error("simulated failed write");
      this.docs.find(row => row.loan_id === args[0])!.document = JSON.parse(args[1]);
    }
    if (sql.startsWith("INSERT INTO public.roads_development_upgrades"))
      this.applied.push({ id: args[0], checksum: args[1] });
    return { rows: [] };
  }
}
let db: FakeDb;
beforeEach(() => { db = new FakeDb(); });
const dev = { NODE_ENV: "development" };
describe("development database upgrades", () => {
  it("automatically applies only approved steps and verifies compatibility", async () => {
    const upgrades = await readUpgrades();
    const approvals = await readAutomaticApprovals();
    expect((await automaticallyUpgradeDevelopment(db as any, upgrades, approvals, dev)).status).toBe("compatible");
    expect(db.applied).toHaveLength(2);
    db.calls = [];
    expect((await automaticallyUpgradeDevelopment(db as any, upgrades, approvals, dev)).status).toBe("compatible");
    expect(db.calls.some(sql => /CREATE|UPDATE|INSERT|DELETE|ALTER/.test(sql))).toBe(false);
  });
  it("blocks the whole automatic run if any pending upgrade lacks exact approval", async () => {
    const upgrades = await readUpgrades();
    const approvals = await readAutomaticApprovals();
    for (const changed of [{}, { ...approvals, [upgrades[1].id]: "changed" }]) {
      db.calls = [];
      const report = await automaticallyUpgradeDevelopment(db as any, upgrades, changed, dev);
      expect(report.status).toBe("blocked");
      expect(db.calls.some(sql => /CREATE|UPDATE|INSERT|DELETE|ALTER/.test(sql))).toBe(false);
      expect(db.applied).toEqual([]);
    }
  });
  it("does not try to repair drift or run automatically in production", async () => {
    const upgrades = await readUpgrades();
    db.table = true; db.extraColumn = true;
    expect((await automaticallyUpgradeDevelopment(db as any, upgrades, await readAutomaticApprovals(), dev)).status).toBe("blocked");
    db.calls = [];
    await expect(automaticallyUpgradeDevelopment(db as any, upgrades, {}, { NODE_ENV: "production" })).rejects.toThrow();
    expect(db.calls).toEqual([]);
  });
  it("checks approvals again under the transaction lock before writing", async () => {
    await expect(applyDevelopmentUpgrades(db as any, await readUpgrades(), dev, true, {})).rejects.toThrow("approval");
    expect(db.calls.some(sql => /CREATE|UPDATE|INSERT|DELETE|ALTER/.test(sql))).toBe(false);
  });
  it("rolls back an automatic upgrade failure instead of recording success", async () => {
    db.table = true; db.failUpdate = true;
    const document = newLoanApplication({ id: "a", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
    delete document.schemaVersion;
    db.docs = [{ loan_id: "a", document }];
    await expect(automaticallyUpgradeDevelopment(db as any, await readUpgrades(), await readAutomaticApprovals(), dev)).rejects.toThrow();
    expect(db.applied).toEqual([]);
    expect(db.docs[0].document.schemaVersion).toBeUndefined();
  });
  it("checks an empty database without issuing any mutation", async () => {
    const result = await inspectDatabase(db as any, await readUpgrades());
    expect(result.status).toBe("needs-upgrade");
    expect(db.calls.some(sql => /CREATE|UPDATE|INSERT|DELETE|ALTER/.test(sql))).toBe(false);
  });
  it("bootstraps once and is safe to repeat", async () => {
    const upgrades = await readUpgrades();
    expect((await applyDevelopmentUpgrades(db as any, upgrades, dev, true)).status).toBe("compatible");
    expect(db.applied).toHaveLength(2);
    db.calls = [];
    expect((await applyDevelopmentUpgrades(db as any, upgrades, dev, true)).status).toBe("compatible");
    expect(db.applied).toHaveLength(2);
    expect(db.calls.some(sql => sql.startsWith("INSERT") || sql.startsWith("UPDATE"))).toBe(false);
  });
  it("preserves each loan and upgrades old documents without overwriting fields", async () => {
    db.table = true;
    db.docs = ["a", "b"].map(loan_id => {
      const document = newLoanApplication({ id: loan_id, loanNumber: "123456790", source: "blank", borrowerCount: 2 });
      delete document.schemaVersion; document.revision = loan_id === "a" ? 0 : 8;
      document.sections["custom"] = { owner: loan_id, amount: 450 };
      return { loan_id, document };
    });
    const originals = structuredClone(db.docs);
    await applyDevelopmentUpgrades(db as any, await readUpgrades(), dev, true);
    db.docs.forEach((row, i) => {
      const { schemaVersion, revision, ...rest } = row.document;
      const { revision: previous, ...old } = originals[i].document;
      expect(rest).toEqual(old);
      expect(schemaVersion).toBe(1);
      expect(revision).toBe(previous === 0 ? 0 : previous + 1);
    });
  });
  it("rolls back failed upgrades including ledger changes", async () => {
    db.table = true; db.failUpdate = true;
    const document = newLoanApplication({ id: "a", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
    delete document.schemaVersion;
    db.docs = [{ loan_id: "a", document }];
    await expect(applyDevelopmentUpgrades(db as any, await readUpgrades(), dev, true)).rejects.toThrow();
    expect(db.calls.at(-1)).toBe("ROLLBACK");
    expect(db.applied).toEqual([]);
    expect(db.docs[0].document.schemaVersion).toBeUndefined();
  });
  it("blocks edited history, newer branches, and schema drift", async () => {
    const upgrades = await readUpgrades();
    await applyDevelopmentUpgrades(db as any, upgrades, dev, true);
    db.applied[0].checksum = "changed";
    expect((await inspectDatabase(db as any, upgrades)).status).toBe("blocked");
    db.applied[0].checksum = upgrades[0].checksum;
    db.applied.push({ id: "099-newer", checksum: "unknown" });
    expect((await inspectDatabase(db as any, upgrades)).status).toBe("blocked");
    db.applied.pop(); db.extraColumn = true;
    await expect(applyDevelopmentUpgrades(db as any, upgrades, dev, true)).rejects.toThrow("differences");
  });
  it("refuses incompatible documents rather than repairing them", async () => {
    db.table = true;
    db.docs = [{ loan_id: "a", document: { schemaVersion: 999 } as LoanApplication }];
    const report = await inspectDatabase(db as any, await readUpgrades());
    expect(report.status).toBe("blocked");
    expect(report.issues[0]).toContain("Stored loan document");
  });
  it("refuses production, deployments and unconfirmed commands before issuing SQL", async () => {
    for (const env of [{ NODE_ENV: "production" }, { NODE_ENV: "development", REPLIT_DEPLOYMENT: "1" }, {}])
      expect(() => assertDevelopmentUpgrade(env, true)).toThrow("development-only");
    await expect(applyDevelopmentUpgrades(db as any, await readUpgrades(), dev, false)).rejects.toThrow();
    expect(db.calls).toEqual([]);
  });
});
