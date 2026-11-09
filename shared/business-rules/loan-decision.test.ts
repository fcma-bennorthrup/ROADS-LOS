import { expect, it } from "vitest";
import type { LoanApplication } from "../loan-application";
import { evaluateLoanDecision, loanDecisionActionStatus } from "./loan-decision";
import { resetChecklistData } from "../reset-checklist-data";

it("requires saved credit, not TRID or estimate completion", () => {
  for (const value of [undefined, false, "true"]) {
    expect(evaluateLoanDecision({ sections: { "credit-pulled": value } } as unknown as LoanApplication).ready).toBe(false);
  }
  expect(evaluateLoanDecision({ sections: { "credit-pulled": true } } as unknown as LoanApplication).ready).toBe(true);
  expect(loanDecisionActionStatus(true, "not-started")).toBe("in-progress");
  expect(loanDecisionActionStatus(true, "complete")).toBe("complete");
  expect(loanDecisionActionStatus(false, "not-started")).toBe("not-started");
});

it("checklist reset clears decision readiness", () => {
  const app = { loan: { id: "demo" }, borrowers: [], generation: 1, revision: 1,
    sections: { "credit-pulled": true } } as unknown as LoanApplication;
  expect(resetChecklistData(app).businessRules?.loanDecision.ready).toBe(false);
});
