import type { LoanApplication } from "../loan-application";

/** Event-driven rule: persist the transition in the same write as the import. */
export function stageAfterBlendImport(stage: LoanApplication["loan"]["stage"]) {
  return stage === "Customer Application" ? "Decisioning" : stage;
}

/** All prerequisites must be present in the saved, loan-scoped snapshot. */
export function stageAfterSavedProgress(app: LoanApplication) {
  if (app.loan.stage !== "Decisioning") return app.loan.stage;
  const details = app.sections["loan-details"] as { intentToProceed?: unknown } | undefined;
  if (details?.intentToProceed !== true) return app.loan.stage;
  try {
    const checklist = JSON.parse(String(app.sections[`storage:loan-checklist-statuses:${app.loan.id}`] ?? "{}"));
    const required: [string, number[]][] = [
      ["Loan Decision", [0]],
      ["Title Work", [0]],
      ["Appraisal Evaluation", [0]],
      ["Early Disclosures", [0, 1]],
      ["Loan Estimate", [0, 1]],
      ["Decision Letter", [0, 1]],
    ];
    if (required.every(([task, actions]) => actions.every(index => checklist?.[task]?.[index] === "complete")))
      return "Loan Finalization";
  } catch { /* Malformed progress is not evidence of completion. */ }
  return app.loan.stage;
}
