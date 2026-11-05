import { describe, expect, it } from "vitest";
import { resetChecklistData } from "./reset-checklist-data";
import type { LoanApplication } from "./loan-application";
import { evaluateLoanRules } from "./business-rules";

function fixture(): LoanApplication {
  const app = {
    loan: { id: "reset-test", amountRequested: "145000" }, borrowers: [{ id: "primary", name: "Demo Applicant" }],
    mode: "blend", generation: 1, revision: 5, changeLog: [{ field: "First Name" }],
    sections: {
      "borrower-primary": { firstName: "Demo", lastName: "Applicant", ssn: "XXX-XX-1234" },
      "subject-property": { address1: "1 Demo Street", city: "Louisville", state: "KY", zip: "40234",
        monthlyPropertyTaxes: "125.50", monthlyInsurance: "0" },
      "loan-details": { requestedLoanAmount: "145000" },
      income: [{ incomeSources: [{ incomeType: "W2", baseEmploymentIncome: "5000" }] }],
      "evaluation-1": { estimatedValue: "195000", appraiser: "Demo Appraiser" },
      "storage:loan-checklist-statuses:reset-test": JSON.stringify({
        "Loan Estimate": ["complete", "complete"], "Loan Decision": ["complete"],
        "Decision Letter": ["complete", "complete"], __lockedPricing: { version: 1 },
        __rateLockTridVersion: 2,
      }),
      "storage:loan-closing-package:reset-test": '{"generatedAt":"yesterday"}',
      "storage:loan-closing-disclosures:reset-test": '{"records":[{}]}',
      "storage:loan-runtime-activity:reset-test": '[{"id":"generated"}]',
      "loan-estimate-generation": "generated", "loan-estimate-generated-at": "yesterday",
      "loan-estimate-delivered-at": "yesterday", "at-app-disclosures-generation": "generated",
      "credit-pulled": true, "booking-state": "booked", "booking-at": "yesterday",
      "current-liabilities": [{ id: "credit-primary-card" }, { id: "manual" }],
    },
  } as unknown as LoanApplication;
  app.businessRules = evaluateLoanRules(app);
  app.businessRules = evaluateLoanRules(app);
  return app;
}
describe("checklist-only reset", () => {
  it("clears task outputs atomically while preserving application and history", () => {
    const app = fixture();
    const result = resetChecklistData(app);
    expect(result.generation).toBe(2);
    expect(result.revision).toBe(6);
    expect(result.borrowers).toEqual(app.borrowers);
    expect(result.changeLog).toEqual(app.changeLog);
    for (const key of ["borrower-primary", "subject-property", "loan-details", "income"])
      expect(result.sections[key]).toEqual(app.sections[key]);
    expect(result.sections["loan-estimate-generation"]).toBe("idle");
    expect(result.sections["loan-estimate-generated-at"]).toBeNull();
    expect(result.sections["loan-estimate-delivered-at"]).toBeNull();
    expect(result.sections["storage:loan-closing-disclosures:reset-test"]).toBeNull();
    expect(result.sections["storage:loan-closing-package:reset-test"]).toBeNull();
    expect(result.sections["storage:loan-runtime-activity:reset-test"]).toBe("[]");
    expect(result.sections["current-liabilities"]).toEqual([{ id: "manual" }]);
    expect(result.sections["credit-pulled"]).toBe(false);
    expect(result.sections["booking-state"]).toBe("idle");
    expect(result.sections["evaluation-1"]).toEqual({ estimatedValue: "195000", appraiser: "" });
    const checklist = JSON.parse(result.sections["storage:loan-checklist-statuses:reset-test"] as string);
    expect(checklist["Loan Estimate"]).toEqual(["not-started", "not-started"]);
    expect(checklist.__lockedPricing).toBeUndefined();
    expect(checklist.__rateLockTridVersion).toBeUndefined();
    expect(result.businessRules?.trid.status).toBe("required");
    expect(result.businessRules?.ecoa.status).toBe("required");
    expect(app.sections["loan-estimate-generation"]).toBe("generated");
  });
});
