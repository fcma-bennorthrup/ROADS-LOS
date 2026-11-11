import type { LoanApplication } from "../loan-application";
import { evaluateLoanRules } from "../business-rules";
import { withOriginationFee } from "../business-rules/origination-fee";

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

/** Reset task outputs and application edits without changing the captured baseline. */
export function resetToBaseline(current: LoanApplication): LoanApplication {
  const baseline = current.meta?.baseline;
  if (!baseline || !current.meta) throw new Error("A Salesforce baseline is required before resetting.");
  const sections = structuredClone(baseline.sections);
  const checklistKey = `storage:loan-checklist-statuses:${current.loan.id}`;
  const previousChecklist = current.sections[checklistKey];
  if (typeof previousChecklist === "string") {
    sections[checklistKey] = JSON.stringify(Object.fromEntries(
      Object.entries(JSON.parse(previousChecklist))
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [key, (value as unknown[]).map(() => "not-started")]),
    ));
  }
  const next: LoanApplication = {
    schemaVersion: current.schemaVersion,
    loan: structuredClone(baseline.loan),
    borrowers: structuredClone(baseline.borrowers),
    sections, mode: "empty", changeLog: [],
    generation: current.generation + 1, revision: current.revision + 1,
    meta: {
      ...structuredClone(current.meta),
      source: "sf", opportunity: structuredClone(baseline.opportunity),
    },
  };
  const initialized = withOriginationFee(next);
  initialized.businessRules = evaluateLoanRules(initialized);
  return initialized;
}
