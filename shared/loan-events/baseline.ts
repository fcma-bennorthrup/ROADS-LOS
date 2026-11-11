import type { LoanApplication } from "../loan-application";

/** Capture only the original opportunity data, never aliases to the live loan. */
export function captureBaseline(document: LoanApplication, now: Date) {
  if (!document.meta?.opportunity) throw new Error("A baseline requires Salesforce opportunity details.");
  return structuredClone({
    capturedAt: now.toISOString(),
    loan: document.loan,
    borrowers: document.borrowers,
    sections: document.sections,
    opportunity: document.meta.opportunity,
  });
}
