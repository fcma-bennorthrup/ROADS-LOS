import { describe, expect, it } from "vitest";
import type { LoanApplication } from "../loan-application";
import { applyTridDemoAction } from "./trid-demo-actions";
import { evaluateLoanRules } from "./index";

function satisfied(): LoanApplication {
  const app = {
    loan: { id: "demo" }, borrowers: [], mode: "blend", revision: 5, generation: 2,
    sections: {
      "borrower-primary": { firstName: "A", lastName: "B", ssn: "XXX-XX-1234", email: "demo@example.com" },
      "borrower-secondary": { firstName: "C", lastName: "D", ssn: "XXX-XX-4321" },
      "subject-property": { address1: "123 Test", city: "City", state: "KY", zip: "12345" },
      "loan-details": { requestedLoanAmount: "100000", purpose: "Purchase" },
      income: [{ id: "primary", incomeSources: [{ incomeType: "W2", baseEmploymentIncome: "5000" }] }],
      "evaluation-1": { estimatedValue: "200000", appraiser: "Demo" },
      "evaluation-2": { estimatedValue: "200000" },
      "loan-estimate-generation": "complete",
      "loan-estimate-generated-at": "yesterday",
      "loan-estimate-delivered-at": "yesterday",
      "credit-pulled": true,
      "storage:loan-checklist-statuses:demo": JSON.stringify({
        "Loan Estimate": ["complete", "complete"], "Loan Decision": ["complete"],
        __rateLockTridVersion: 2, __lockedPricing: { rate: 6 },
      }),
    },
  } as unknown as LoanApplication;
  app.businessRules = evaluateLoanRules(app);
  app.businessRules = evaluateLoanRules(app);
  return app;
}

describe("TRID demo actions", () => {
  it("clears all six inputs and TRID history, without resetting unrelated work", () => {
    const app = satisfied();
    const next = applyTridDemoAction(app, "trid-reset");
    expect(app.businessRules?.trid.status).toBe("satisfied");
    expect(next.businessRules?.trid).toMatchObject({ status: "not-triggered", triggeredAt: null, satisfiedAt: null });
    expect(next.businessRules?.trid.missing).toHaveLength(6);
    expect(evaluateLoanRules(next).trid.status).toBe("not-triggered");
    expect(next.sections["borrower-primary"]).toMatchObject({ firstName: "", ssn: "", email: "demo@example.com" });
    expect(next.sections["borrower-secondary"]).toMatchObject({ firstName: "", ssn: "" });
    expect(next.sections["credit-pulled"]).toBe(true);
    expect(next.sections["loan-estimate-generation"]).toBe("idle");
    expect(next.changeLog?.length).toBeGreaterThan(0);
    expect(next.generation).toBe(3);
    const checklist = JSON.parse(String(next.sections["storage:loan-checklist-statuses:demo"]));
    expect(checklist).toMatchObject({ "Loan Estimate": ["not-started", "not-started"], "Loan Decision": ["complete"], __lockedPricing: { rate: 6 } });
  });
  it("manually reopens TRID with unchanged inputs, and only new delivery satisfies it", () => {
    const app = satisfied();
    const next = applyTridDemoAction(app, "trid-manual");
    for (const key of ["borrower-primary", "borrower-secondary", "subject-property", "loan-details", "income", "evaluation-1"])
      expect(next.sections[key]).toEqual(app.sections[key]);
    expect(evaluateLoanRules(next).trid.status).toBe("required");
    expect(next.sections["loan-estimate-delivered-at"]).toBeNull();
    next.sections["storage:loan-checklist-statuses:demo"] = JSON.stringify({ "Loan Estimate": ["complete", "complete"] });
    expect(evaluateLoanRules(next).trid.status).toBe("satisfied");
  });
});
