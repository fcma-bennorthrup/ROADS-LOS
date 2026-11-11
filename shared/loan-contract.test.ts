import { describe, expect, it } from "vitest";
import { assertLoanDocument, loanApplicationSchema, subjectPropertySchema } from "./loan-contract";
import { newLoanApplication } from "./loan-factory";
import { blendDemoSections } from "../client/src/lib/blend-demo-fixture";
import { shouldIgnorePath } from "../server/sync-mechanics";

describe("shared loan model", () => {
  const withBaseline = () => {
    const app = newLoanApplication({ id: "baseline-contract-test", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
    app.meta!.baseline = {
      capturedAt: "2026-11-11T00:00:00.000Z",
      loan: structuredClone(app.loan),
      borrowers: structuredClone(app.borrowers),
      sections: { "borrower-primary": { firstName: "Avery" }, "future-section": { keep: true } },
      opportunity: { region: "500", loanOfficer: "Demo Officer", applicationDate: "2026-11-11",
        queue: "Sales Support", decision: "" },
    };
    return app;
  };
  it("accepts optional baselines without altering them and still accepts absent baselines", () => {
    const app = withBaseline();
    const before = structuredClone(app);
    expect(() => assertLoanDocument(app)).not.toThrow();
    expect(loanApplicationSchema.parse(app)).toEqual(before);
    delete app.meta!.baseline;
    expect(() => assertLoanDocument(app)).not.toThrow();
  });
  it("checks baseline loan ownership, borrower identities and recognized sections", () => {
    const mutations: ((app: ReturnType<typeof withBaseline>) => void)[] = [
      app => { app.meta!.baseline!.loan.id = "another-loan"; },
      app => { app.meta!.baseline!.borrowers[0].loanId = "another-loan"; },
      app => { app.meta!.baseline!.borrowers.push(app.meta!.baseline!.borrowers[0]); },
      app => { app.meta!.baseline!.sections.income = "invalid"; },
      app => { app.meta!.baseline!.sections["subject-property"] = { parcel: 12 }; },
      app => { app.meta!.baseline!.loan.stage = "unknown"; },
      app => { app.meta!.baseline!.capturedAt = "not-a-date"; },
    ];
    for (const mutate of mutations) {
      const app = withBaseline();
      mutate(app);
      expect(() => assertLoanDocument(app)).toThrow("does not match");
    }
  });
  it("uses the opportunity contract inside a baseline", () => {
    const app = withBaseline();
    const baseline = app.meta!.baseline!;
    expect(loanApplicationSchema.safeParse({
      ...app, meta: { ...app.meta, baseline: { ...baseline, opportunity: { ...baseline.opportunity, queue: "Other" } } },
    }).success).toBe(false);
  });
  it("accepts legacy property data and text parcel IDs, not numeric identifiers", () => {
    expect(subjectPropertySchema.safeParse({ zip: "40234" }).success).toBe(true);
    for (const parcel of ["", "000-012-A", "Lot 3 / Block 2"])
      expect(subjectPropertySchema.safeParse({ zip: "40234", parcel }).success).toBe(true);
    expect(subjectPropertySchema.safeParse({ parcel: 123 }).success).toBe(false);
  });
  it.each([1, 2] as const)("validates actual Blend fixtures with %i borrowers", borrowerCount => {
    const loan = newLoanApplication({ id: "model", loanNumber: "123456790", source: "blend",
      borrowerCount, sections: blendDemoSections("model", borrowerCount) });
    expect(loanApplicationSchema.safeParse(loan).success).toBe(true);
    const legacy = structuredClone(loan); delete legacy.schemaVersion;
    expect(() => assertLoanDocument(legacy, "model")).not.toThrow();
  });
  it("rejects incompatible versions, identities, stages and recognized section shapes", () => {
    const base = newLoanApplication({ id: "model", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
    for (const changed of [
      { ...base, schemaVersion: 99 }, { ...base, revision: -1 },
      { ...base, loan: { ...base.loan, stage: "unknown" } },
      { ...base, borrowers: [{ ...base.borrowers[0], loanId: "another" }] },
      { ...base, sections: { "current-liabilities": "not-an-array" } },
      { ...base, sections: { income: [{ incomeSources: "not-an-array" }] } },
    ]) expect(() => assertLoanDocument(changed)).toThrow("does not match");
    expect(() => assertLoanDocument(base, "other")).toThrow();
  });
  it("does not strip future optional fields or change saved values", () => {
    const loan = newLoanApplication({ id: "model", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
    loan.sections["future-section"] = { retained: true };
    loan.extra = "retained";
    const before = JSON.stringify(loan);
    assertLoanDocument(loan);
    expect(JSON.stringify(loan)).toBe(before);
  });
  it("keeps the shared model, upgrades and procedure eligible for custom sync", () => {
    for (const path of ["shared/loan-contract.ts", "script/database.ts", "script/db-compatibility.ts",
      "script/db-upgrades/manifest.json", "script/db-upgrades/001-loan-table.sql",
      "script/db-upgrades/002-document-version.json", "script/db-upgrades/automatic-approvals.json",
      "docs/database-collaboration.md", "replit.md"])
      expect(shouldIgnorePath(path)).toBe(false);
  });
});
