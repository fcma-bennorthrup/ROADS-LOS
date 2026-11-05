import type { LoanApplication } from "../loan-application";

/** A saved successful credit pull is the only start prerequisite in this prototype. */
export function evaluateLoanDecision(app: LoanApplication) {
  return { ready: app.sections["credit-pulled"] === true };
}

export function loanDecisionActionStatus(ready: boolean, status: string): string {
  return ready && status !== "complete" ? "in-progress" : status;
}
