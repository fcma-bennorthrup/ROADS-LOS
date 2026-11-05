import { emptyFields, type LoanApplication } from "./loan-application";
import { evaluateLoanRules } from "./business-rules";

/** Reset task outputs, not the application that makes those tasks necessary. */
export function resetChecklistData(current: LoanApplication): LoanApplication {
  const sections = { ...current.sections };
  const key = `storage:loan-checklist-statuses:${current.loan.id}`;
  let checklist: Record<string, unknown> = {};
  try { checklist = JSON.parse(String(sections[key] ?? "{}")); } catch { /* Replace invalid progress. */ }
  sections[key] = JSON.stringify(Object.fromEntries(Object.entries(checklist)
    .filter(([, value]) => Array.isArray(value))
    .map(([name, values]) => [name, (values as unknown[]).map(() => "not-started")])));
  // Missing legacy tasks also start empty, irrespective of the original sample defaults.
  sections["checklist-reset"] = true;
  sections[`storage:loan-runtime-activity:${current.loan.id}`] = "[]";
  sections[`storage:loan-closing-package:${current.loan.id}`] = null;
  sections[`storage:loan-closing-disclosures:${current.loan.id}`] = null;
  for (const prefix of ["loan-estimate", "at-app-disclosures"]) {
    sections[`${prefix}-generation`] = "idle";
    sections[`${prefix}-generated-at`] = null;
    sections[`${prefix}-delivered-at`] = null;
  }
  sections["credit-pulled"] = false;
  sections["booking-state"] = "idle";
  sections["booking-at"] = null;
  sections["pricing-type"] = "";
  sections["pricing-product"] = "";
  sections["pricing-term"] = null;
  sections["appraisal-split"] = false;
  for (const name of ["closing-details", "evaluation-1", "evaluation-2"]) {
    if (sections[name]) {
      const value = sections[name] as Record<string, unknown>;
      sections[name] = { ...emptyFields(value),
        ...(name.startsWith("evaluation-") ? { estimatedValue: value.estimatedValue ?? "" } : {}) };
    }
  }
  for (const name of ["current-liabilities", "noncurrent-liabilities"]) {
    if (Array.isArray(sections[name])) sections[name] = sections[name].filter(
      row => !(typeof row?.id === "string" && row.id.startsWith("credit-")));
  }
  const next: LoanApplication = {
    ...current, sections, generation: current.generation + 1, revision: current.revision + 1,
    loan: { ...current.loan, stage: "Customer Application", product: "", finalRate: "0", pweCbScore: 0 },
    // Keep the initial application trigger, but discard rate-lock and satisfaction history.
    businessRules: current.businessRules ? { ...current.businessRules,
      trid: { ...current.businessRules.trid, satisfiedAt: null, rateLockVersion: 0 },
      ecoa: { ...current.businessRules.ecoa, satisfiedAt: null },
    } : undefined,
  };
  next.businessRules = evaluateLoanRules(next);
  return next;
}
