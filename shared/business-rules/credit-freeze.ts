import type { LoanApplication } from "../loan-application";

export const CREDIT_FROZEN_MESSAGE = "Credit is frozen. Ask the borrower to lift the freeze, then pull credit again.";
export function isCreditFrozen(app: LoanApplication): boolean {
  return app.sections["credit-frozen"] === true;
}
