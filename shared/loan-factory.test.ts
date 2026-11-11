import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storage } from "../server/storage";
import { newLoanApplication } from "./loan-factory";
import { evaluateLoanRules } from "./business-rules";
import type { LoanApplication } from "./loan-application";

// Frozen pre-extraction reset/import behavior, independent of the new template.
async function previousFactory(blend: boolean, count: 1 | 2, sections: Record<string, unknown>) {
  const loan = { ...(await storage.getLoan("1"))! };
  for (const key of ["financedFees", "taxesInsurance", "finalRate", "principalInterest", "totalMonthlyPayment", "piti", "dti", "lcv", "totalCv", "cashReserves", "cashToClose", "apr"] as const) loan[key] = "0";
  Object.assign(loan, {
    stage: "Customer Application", product: "", pweCbScore: 0, ruleOfXx: null,
    ecoaDaysRemaining: 0, tridDaysRemaining: 0, cifNumber: "",
    loanType: blend ? "Purchase" : "",
    applicationType: blend && count === 2 ? "Joint Credit Application" : "",
    amountRequested: blend ? "145000.00" : "0", displayAmount: blend ? "145000.00" : "0",
    totalLoanAmount: blend ? "145000.00" : "0", primaryBorrowerName: blend ? "Richard Jamerson" : "",
  });
  const borrowers = ["primary", "secondary"].slice(0, blend ? count : 2).map((role, index) => ({
    id: `${loan.id}-${role}`, loanId: loan.id, isPrimary: index === 0,
    name: blend ? `${index === 0 ? "Richard" : "Jane"} Jamerson` : "",
    email: blend ? `${index === 0 ? "richard" : "jane"}.jamerson@example.com` : "",
    phone: blend ? `(502) 555-${index === 0 ? "0142" : "0188"}` : "",
  }));
  const next: LoanApplication = { loan, borrowers, mode: blend ? "blend" : "empty",
    generation: 4, revision: 8, changeLog: [], sections: blend ? structuredClone(Object.fromEntries(
      Object.entries(sections).filter(([key]) => ["borrower-primary", "borrower-secondary", "loan-details", "income", "current-assets", "noncurrent-assets", "current-liabilities", "noncurrent-liabilities", "subject-property", "fees"].includes(key)),
    )) : {} };
  if (blend && count === 1) {
    delete next.sections["borrower-secondary"];
    if (Array.isArray(next.sections.income)) next.sections.income = next.sections.income.slice(0, 1);
  }
  next.businessRules = evaluateLoanRules(next);
  return next;
}

describe("loan factory compatibility", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-09T12:00:00.000Z")); });
  afterEach(() => vi.useRealTimers());
  for (const source of ["blank", "blend"] as const) for (const count of [1, 2] as const) {
    it(`preserves ${source} with ${count} borrowers, apart from new metadata`, async () => {
      const sections = { income: [{ incomeSources: [] }, { incomeSources: [] }],
        "borrower-primary": { firstName: "Richard", lastName: "Jamerson" },
        "borrower-secondary": { firstName: "Jane", lastName: "Jamerson" },
        "current-liabilities": [], "storage:old": "must not carry over", "credit-pulled": true };
      const actual = newLoanApplication({ id: "1", loanNumber: "123456789", source,
        borrowerCount: count, sections, generation: 4, revision: 8, now: "2026-11-09T12:00:00.000Z" });
      const { meta, schemaVersion, ...document } = actual;
      expect(schemaVersion).toBe(1);
      const expected = await previousFactory(source === "blend", count, sections);
      if (source === "blend") {
        expected.sections["origination-fee-initialized"] = true;
        expected.sections.fees = [{
          id: "auto-origination-4", fee: "Origination Fee",
          leAmount: "1000.00", cdAmount: "1000.00",
          methodOfPayment: "Cash", paidBy: "Buyer", paidTo: "",
          shoppedForProvider: false, waived: false,
        }];
      }
      expect(document).toEqual(expected);
      expect(meta).toEqual({ createdAt: "2026-11-09T12:00:00.000Z", updatedAt: "2026-11-09T12:00:00.000Z", source });
    });
  }
  it("creates isolated blank packages without seed defaults or shared references", () => {
    const a = newLoanApplication({ id: "a", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
    const b = newLoanApplication({ id: "b", loanNumber: "123456791", source: "blank", borrowerCount: 2 });
    a.sections.foo = "a";
    expect(b.sections).toEqual({});
    expect(b.mode).toBe("empty");
    expect(b.borrowers.every(row => row.name === "" && row.loanId === "b")).toBe(true);
    expect(b.loan.stage).toBe("Customer Application");
  });
});
