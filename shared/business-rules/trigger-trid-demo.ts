import type { LoanApplication } from "../loan-application";
import { evaluateLoanRules } from "./index";
import { changesForSave } from "../loan-history";

/** Fill missing TRID inputs without replacing unrelated application/workflow data. */
export function triggerTridDemo(current: LoanApplication, templates: Record<string, unknown>): LoanApplication {
  const missing = evaluateLoanRules(current).trid.missing;
  const sections = { ...current.sections };
  const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  function fill(key: string, fields: string[], invalid: (value: unknown) => boolean = value => !String(value ?? "").trim()) {
    const template = object(templates[key]);
    const previous = object(sections[key]);
    const next = { ...template, ...previous };
    for (const field of fields) if (invalid(previous[field])) next[field] = template[field];
    sections[key] = next;
  }
  if (missing.includes("Name") || missing.includes("SSN")) {
    fill("borrower-primary", ["firstName", "lastName"]);
    fill("borrower-primary", ["ssn"], value => typeof value !== "string" ||
      !/^(?:\d{3}-?\d{2}-?\d{4}|[Xx*]{3}-[Xx*]{2}-\d{4})$/.test(value.trim()));
  }
  if (missing.includes("Purchase Address"))
    fill("subject-property", ["address1", "city", "state", "zip"], value => !String(value ?? "").trim() || value === "Address");
  if (missing.includes("Loan Amount")) fill("loan-details", ["requestedLoanAmount"], () => true);
  if (missing.includes("Estimated Property Value")) fill("evaluation-1", ["estimatedValue"], () => true);
  if (missing.includes("Income Information")) {
    const people = Array.isArray(sections.income) ? [...sections.income] : [];
    const templatesPeople = Array.isArray(templates.income) ? templates.income : [];
    const first = object(people[0]);
    const templateSources = object(templatesPeople[0]).incomeSources;
    people[0] = { ...object(templatesPeople[0]), ...first, incomeSources: [
      ...(Array.isArray(first.incomeSources) ? first.incomeSources : []),
      ...(Array.isArray(templateSources) ? templateSources : []),
    ] };
    sections.income = people;
  }
  const next = { ...current, sections, revision: current.revision + 1 };
  next.businessRules = evaluateLoanRules(next);
  if (next.businessRules.trid.missing.length) throw new Error("Demo data is incomplete.");
  next.changeLog = [...(current.changeLog ?? []), ...Object.keys(sections).flatMap((key, index) =>
    changesForSave(key, current.sections[key], sections[key], next.revision)
      .map(entry => ({ ...entry, id: entry.id + index * 1000 })))];
  return next;
}
