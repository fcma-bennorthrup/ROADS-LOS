import type { LoanApplication } from "../loan-application";
import { changesForSave } from "../loan-history";
import { evaluateLoanRules } from "./index";
import { RATE_LOCK_TRID_VERSION } from "./trid";

/** Explicit demo overrides; neither action changes unrelated task outputs. */
export function applyTridDemoAction(current: LoanApplication, action: "trid-reset" | "trid-manual"): LoanApplication {
  const sections = structuredClone(current.sections);
  const key = `storage:loan-checklist-statuses:${current.loan.id}`;
  const checklist = JSON.parse(String(sections[key] ?? "{}"));
  checklist["Loan Estimate"] = ["not-started", "not-started"];
  delete checklist[RATE_LOCK_TRID_VERSION];
  sections[key] = JSON.stringify(checklist);
  sections["loan-estimate-generation"] = "idle";
  sections["loan-estimate-generated-at"] = null;
  sections["loan-estimate-delivered-at"] = null;
  if (action === "trid-reset") {
    const clear = (key: string, fields: string[]) => {
      const value = sections[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        sections[key] = { ...value, ...Object.fromEntries(fields.map(field => [field, ""])) };
      }
    };
    for (const role of ["primary", "secondary"])
      clear(`borrower-${role}`, ["firstName", "middleName", "lastName", "ssn"]);
    clear("subject-property", ["address1", "address2", "city", "state", "zip"]);
    clear("loan-details", ["requestedLoanAmount"]);
    for (const key of ["evaluation-1", "evaluation-2"]) clear(key, ["estimatedValue"]);
    if (Array.isArray(sections.income))
      sections.income = sections.income.map(person => ({ ...person, incomeSources: [] }));
  }
  const rules = evaluateLoanRules(current);
  const next: LoanApplication = {
    ...current, sections, generation: current.generation + 1, revision: current.revision + 1,
    businessRules: { ...rules, trid: {
      ...rules.trid, triggeredAt: action === "trid-manual" ? new Date().toISOString() : null,
      satisfiedAt: null, rateLockVersion: 0,
    } },
  };
  next.businessRules = evaluateLoanRules(next);
  next.changeLog = [...(current.changeLog ?? []), ...Object.keys(sections).flatMap((key, index) =>
    changesForSave(key, current.sections[key], sections[key], next.revision)
      .map(entry => ({ ...entry, id: entry.id + index * 1000 })))];
  return next;
}
