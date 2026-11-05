import { describe, expect, it } from "vitest";
import type { LoanApplication } from "../loan-application";
import { evaluateLoanRules } from "./index";
import { loanEstimateActionsForTrid, RATE_LOCK_TRID_VERSION } from "./trid";

const now = "2026-11-04T12:00:00.000Z";
function application(): LoanApplication {
  return {
    loan: { id: "trid-test" } as LoanApplication["loan"], borrowers: [],
    generation: 0, revision: 0, mode: "empty",
    sections: {
      "borrower-primary": { firstName: "Demo", lastName: "Applicant", ssn: "XXX-XX-1234" },
      "subject-property": { address1: "125 Meadow Lane", city: "Louisville", state: "KY", zip: "40234" },
      "loan-details": { requestedLoanAmount: "$145,000.00" },
      income: [{ incomeSources: [{ incomeType: "W2", baseEmploymentIncome: "0" }] }],
      "evaluation-1": { estimatedValue: "195,000" },
    },
  };
}
describe("TRID business rule", () => {
  it("starts the checklist from TRID without waiting for a decision letter", () => {
    expect(loanEstimateActionsForTrid("required", ["not-started", "not-started"]))
      .toEqual(["in-progress", "not-started"]);
    expect(loanEstimateActionsForTrid("required", ["complete", "not-started"]))
      .toEqual(["complete", "not-started"]);
    expect(loanEstimateActionsForTrid("not-triggered", ["not-started", "not-started"]))
      .toEqual(["not-started", "not-started"]);
  });
  it("reopens TRID on a saved rate-lock update and requires regeneration then delivery", () => {
    const app = application();
    const key = "storage:loan-checklist-statuses:trid-test";
    app.sections[key] = JSON.stringify({ "Loan Estimate": ["complete", "complete"] });
    app.businessRules = evaluateLoanRules(app, now);
    expect(app.businessRules.trid.status).toBe("satisfied");
    const actions = loanEstimateActionsForTrid("satisfied", ["complete", "complete"], true);
    expect(actions).toEqual(["re-fire", "not-started"]);
    app.sections[key] = JSON.stringify({ "Loan Estimate": actions, [RATE_LOCK_TRID_VERSION]: 1 });
    app.businessRules = evaluateLoanRules(app, "2026-11-05T12:00:00.000Z");
    expect(app.businessRules.trid).toMatchObject({ status: "required", rateLockVersion: 1, satisfiedAt: null });
    app.sections[key] = JSON.stringify({ "Loan Estimate": ["complete", "re-fire"], [RATE_LOCK_TRID_VERSION]: 1 });
    app.businessRules = evaluateLoanRules(app, now);
    expect(app.businessRules.trid.status).toBe("required");
    app.sections[key] = JSON.stringify({ "Loan Estimate": ["complete", "complete"], [RATE_LOCK_TRID_VERSION]: 1 });
    app.businessRules = evaluateLoanRules(app, now);
    expect(app.businessRules.trid.status).toBe("satisfied");
    expect(evaluateLoanRules(app, now).trid.status).toBe("satisfied");
  });
  it("can trigger from a rate-lock update even with missing six-input data", () => {
    const app = application();
    app.sections = { "storage:loan-checklist-statuses:trid-test": JSON.stringify({
      [RATE_LOCK_TRID_VERSION]: 1, "Loan Estimate": ["re-fire", "not-started"],
    }) };
    expect(evaluateLoanRules(app, now).trid.status).toBe("required");
  });
  it("triggers only when all six saved inputs exist", () => {
    const app = application();
    expect(evaluateLoanRules(app, now).trid).toMatchObject({ status: "required", triggeredAt: now, missing: [] });
    for (const key of Object.keys(app.sections)) {
      const incomplete = application(); delete incomplete.sections[key];
      expect(evaluateLoanRules(incomplete, now).trid.status).toBe("not-triggered");
    }
  });
  it("does not combine one applicant's SSN with another applicant's name", () => {
    const app = application();
    app.sections["borrower-primary"] = { firstName: "Demo", lastName: "Applicant", ssn: "" };
    app.sections["borrower-secondary"] = { firstName: "", lastName: "", ssn: "123-45-6789" };
    expect(evaluateLoanRules(app, now).trid.status).toBe("not-triggered");
  });
  it("rejects invalid values, blank income and placeholder addresses", () => {
    for (const [key, value] of [
      ["loan-details", { requestedLoanAmount: "Infinity" }],
      ["evaluation-1", { estimatedValue: "not a value" }],
      ["income", [{ incomeSources: [{ incomeType: "W2", baseEmploymentIncome: "" }] }]],
      ["subject-property", { address1: "Address", city: "Louisville", state: "KY", zip: "40234" }],
    ] as const) {
      const app = application(); app.sections[key] = value;
      expect(evaluateLoanRules(app, now).trid.status).toBe("not-triggered");
    }
  });
  it("retains the trigger after clearing inputs; only delivery satisfies it", () => {
    const app = application(); app.businessRules = evaluateLoanRules(app, now);
    delete app.sections["evaluation-1"];
    app.sections["storage:loan-checklist-statuses:trid-test"] = JSON.stringify({ "Loan Estimate": ["complete", "not-started"] });
    expect(evaluateLoanRules(app, now).trid.status).toBe("required");
    app.sections["storage:loan-checklist-statuses:trid-test"] = JSON.stringify({ "Loan Estimate": ["complete", "complete"] });
    app.businessRules = evaluateLoanRules(app, now);
    expect(app.businessRules.trid).toMatchObject({ status: "satisfied", triggeredAt: now, satisfiedAt: now });
    expect(evaluateLoanRules(app, "2026-11-05T12:00:00.000Z").trid.satisfiedAt).toBe(now);
    app.sections["storage:loan-checklist-statuses:trid-test"] = JSON.stringify({ "Loan Estimate": ["re-fire", "re-fire"] });
    expect(evaluateLoanRules(app, now).trid.status).toBe("required");
  });
  it("starts fresh after demo replacement and ignores other loans' delivery", () => {
    const app = application();
    app.sections["storage:loan-checklist-statuses:other"] = JSON.stringify({ "Loan Estimate": ["complete", "complete"] });
    expect(evaluateLoanRules(app, now).trid.status).toBe("required");
    app.sections = {};
    expect(evaluateLoanRules(app, now).trid.status).toBe("not-triggered");
  });
});
