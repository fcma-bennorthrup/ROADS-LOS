import type { LoanApplication } from "../loan-application";

export interface TridResult {
  status: "not-triggered" | "required" | "satisfied";
  triggeredAt: string | null;
  satisfiedAt: string | null;
  missing: string[];
  rateLockVersion?: number;
}

export const RATE_LOCK_TRID_VERSION = "__rateLockTridVersion";

/** A confirmed update starts a new estimate cycle, even before initial TRID completion. */
export function loanEstimateActionsForTrid(
  status: TridResult["status"],
  actions: string[],
  rateLockUpdated = false,
): string[] {
  if (rateLockUpdated) return ["re-fire", "not-started"];
  if (status === "required" && actions[0] === "not-started") return ["in-progress", actions[1] ?? "not-started"];
  return actions;
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const amount = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return NaN;
  if (String(value).trim() === "") return NaN;
  return Number(String(value).replace(/[$,\s]/g, ""));
};
// Masked SSNs are intentional synthetic values in this prototype's Blend fixture.
const ssn = (value: unknown) => typeof value === "string" &&
  /^(?:\d{3}-?\d{2}-?\d{4}|[Xx*]{3}-[Xx*]{2}-\d{4})$/.test(value.trim());
const positive = (value: unknown) => Number.isFinite(amount(value)) && amount(value) > 0;

export function evaluateTrid(app: LoanApplication, now: string): TridResult {
  const sections = app.sections;
  const applicants = ["borrower-primary", "borrower-secondary"].map(key => record(sections[key]));
  // Name and SSN must belong to the same applicant.
  const applicant = applicants.find(person => ssn(person.ssn) && text(person.firstName) && text(person.lastName));
  const property = record(sections["subject-property"]);
  const income = Array.isArray(sections.income) ? sections.income : [];
  const hasIncome = income.some(person => {
    const sources = record(person).incomeSources;
    return Array.isArray(sources) && sources.some(source => {
      const row = record(source);
      return text(row.incomeType) && ["baseEmploymentIncome", "overtime", "bonuses", "commissions", "other"]
        .some(field => Number.isFinite(amount(row[field])) && amount(row[field]) >= 0);
    });
  });
  const fields: Record<string, boolean> = {
    "SSN": Boolean(applicant),
    "Name": Boolean(applicant),
    "Purchase Address": ["address1", "city", "state", "zip"].every(key => text(property[key]))
      && property.address1 !== "Address",
    "Loan Amount": positive(record(sections["loan-details"]).requestedLoanAmount),
    "Income Information": hasIncome,
    "Estimated Property Value": ["evaluation-1", "evaluation-2"]
      .some(key => positive(record(sections[key]).estimatedValue)),
  };
  const missing = Object.entries(fields).filter(([, present]) => !present).map(([key]) => key);
  const previous = app.businessRules?.trid;
  let triggeredAt = previous?.triggeredAt ?? (missing.length === 0 ? now : null);
  let rateLockVersion = previous?.rateLockVersion ?? 0;
  let delivered = false;
  try {
    const checklist = JSON.parse(String(sections[`storage:loan-checklist-statuses:${app.loan.id}`] ?? "{}"));
    const savedVersion = checklist?.[RATE_LOCK_TRID_VERSION];
    if (Number.isSafeInteger(savedVersion) && savedVersion > rateLockVersion) {
      rateLockVersion = savedVersion;
      triggeredAt = now;
    }
    delivered = checklist?.["Loan Estimate"]?.[1] === "complete";
  } catch { /* Invalid/missing saved progress never proves delivery. */ }
  return {
    status: !triggeredAt ? "not-triggered" : delivered && rateLockVersion === (previous?.rateLockVersion ?? 0) ? "satisfied" : "required",
    triggeredAt,
    satisfiedAt: triggeredAt && delivered && rateLockVersion === (previous?.rateLockVersion ?? 0) ? previous?.satisfiedAt ?? now : null,
    missing,
    rateLockVersion,
  };
}
