import { describe, expect, it } from "vitest";
import { assertLoanDocument, loanApplicationSchema } from "./loan-contract";
import { newLoanApplication } from "./loan-factory";
import { blendDemoSections } from "../client/src/lib/blend-demo-fixture";
import { shouldIgnorePath } from "../server/sync-mechanics";

describe("shared loan model", () => {
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
