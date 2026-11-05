import type { LoanApplication } from "../loan-application";

export interface EcoaResult {
  status: "not-triggered" | "required" | "satisfied";
  triggeredAt: string | null;
  satisfiedAt: string | null;
}

/** Blend import stands in for application completeness; no calendar calculation. */
export function evaluateEcoa(app: LoanApplication, now: string): EcoaResult {
  const previous = app.businessRules?.ecoa;
  const triggeredAt = previous?.triggeredAt ?? (app.mode === "blend" ? now : null);
  let completed = false;
  try {
    const checklist = JSON.parse(String(app.sections[`storage:loan-checklist-statuses:${app.loan.id}`] ?? "{}"));
    completed = checklist?.["Loan Decision"]?.[0] === "complete" &&
      checklist?.["Decision Letter"]?.[0] === "complete" &&
      checklist?.["Decision Letter"]?.[1] === "complete";
  } catch { /* Missing or malformed saved progress does not prove completion. */ }
  return {
    status: !triggeredAt ? "not-triggered" : completed ? "satisfied" : "required",
    triggeredAt,
    satisfiedAt: triggeredAt && completed ? previous?.satisfiedAt ?? now : null,
  };
}
