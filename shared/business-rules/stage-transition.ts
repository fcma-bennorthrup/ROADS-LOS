import type { LoanApplication } from "../loan-application";

function calendarDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = us ? `${us[3]}-${us[1]}-${us[2]}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Event-driven rule: persist the transition in the same write as the import. */
export function stageAfterBlendImport(stage: LoanApplication["loan"]["stage"]) {
  return stage === "Customer Application" ? "Decisioning" : stage;
}

/** All prerequisites must be present in the saved, loan-scoped snapshot. */
export function stageAfterSavedProgress(app: LoanApplication) {
  if (app.loan.stage === "Closing") {
    const details = app.sections["closing-details"] as Record<string, unknown> | undefined;
    const closing = calendarDate(details?.closingDate);
    const disbursement = calendarDate(details?.disbursementDate);
    const wire = app.sections["wire-request"] as { requestedAt?: unknown } | undefined;
    try {
      const pkg = JSON.parse(String(app.sections[`storage:loan-closing-package:${app.loan.id}`] ?? "{}"));
      if (closing && disbursement && disbursement >= closing && details?.preClosingReviewComplete === true &&
          typeof wire?.requestedAt === "string" && Number.isFinite(Date.parse(wire.requestedAt)) &&
          typeof pkg?.generatedAt === "string" && Number.isFinite(Date.parse(pkg.generatedAt)))
        return "Booking";
    } catch { /* An invalid package does not establish completion. */ }
    return app.loan.stage;
  }
  if (app.loan.stage === "Loan Finalization") {
    try {
      const checklist = JSON.parse(String(app.sections[`storage:loan-checklist-statuses:${app.loan.id}`] ?? "{}"));
      const history = JSON.parse(String(app.sections[`storage:loan-closing-disclosures:${app.loan.id}`] ?? "{}"));
      const records = Array.isArray(history) ? history : history?.records;
      const tasksComplete = ["Title Work", "Appraisal Evaluation"].every(task =>
        [0, 1, 2].every(index => checklist?.[task]?.[index] === "complete"));
      const cdDelivered = Array.isArray(records) && records.some(record =>
        typeof record?.generatedAt === "string" && Number.isFinite(Date.parse(record.generatedAt)) &&
        typeof record?.deliveredAt === "string" && Number.isFinite(Date.parse(record.deliveredAt)));
      if (tasksComplete && cdDelivered && checklist?.["Rate Lock"]?.[0] === "complete") return "Closing";
    } catch { /* Invalid history or progress must not advance the loan. */ }
    return app.loan.stage;
  }
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
