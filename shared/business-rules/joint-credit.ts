import type { LoanApplication } from "../loan-application";

/** Blank reset slots aren't applicants. One applicant never shows a joint chip. */
export function evaluateJointCredit(app: LoanApplication) {
  const borrowerCount = app.borrowers.filter((borrower, index) => {
    const info = app.sections[index === 0 ? "borrower-primary" : "borrower-secondary"] as
      { firstName?: string; lastName?: string } | undefined;
    return info ? Boolean(info.firstName?.trim() || info.lastName?.trim()) : Boolean(borrower.name?.trim());
  }).length;
  return { borrowerCount, showChip: borrowerCount >= 2 };
}
