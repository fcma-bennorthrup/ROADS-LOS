import { randomInt } from "node:crypto";
import { newLoanApplication } from "../shared/loan-factory";
import { evaluateLoanRules } from "../shared/business-rules";

/** Called while holding the creation transaction lock. Wrap rather than reuse a CIF. */
export function allocateCif(used: Set<string>, start = randomInt(100000, 1000000)): string {
  for (let offset = 0; offset < 900000; offset++) {
    const candidate = String(100000 + (start - 100000 + offset) % 900000);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("No six-digit CIFs remain available.");
}

export function newSfOpportunity(id: string, loanNumber: string, cif: string, now = new Date()) {
  const pick = <T,>(values: readonly T[]): T => values[randomInt(values.length)];
  const firstName = pick(["Avery", "Jordan", "Morgan", "Taylor", "Casey", "Alex"]);
  const lastName = pick(["Parker", "Bennett", "Hayes", "Reed", "Ellis", "Brooks"]);
  const name = `${firstName} ${lastName}`;
  const amount = String(randomInt(1, 444100));
  const document = newLoanApplication({ id, loanNumber, source: "blank", borrowerCount: 1, now: now.toISOString() });
  Object.assign(document.loan, { cifNumber: cif, primaryBorrowerName: name,
    loanType: "Purchase", amountRequested: amount, displayAmount: amount, totalLoanAmount: amount });
  document.borrowers = [{ ...document.borrowers[0], name }];
  document.sections = {
    "borrower-primary": { firstName, lastName, ssn: "", dob: "", phone: "", email: "",
      address: "", city: "", state: "", zip: "", maritalStatus: "", dependents: "",
      dependentsAges: "", farmInvolvement: "" },
    "loan-details": { loanType: "purchase", loanPurpose: "", requestedLoanAmount: amount,
      downPaymentAmount: "", downPaymentSource: "", tellTheStory: "", intentToProceed: false, brpLoan: false },
  };
  document.meta!.source = "sf";
  // Persist the prototype's Eastern calendar date, without browser timezone shifts.
  document.meta!.opportunity = {
    region: pick(["500", "502", "504"] as const),
    loanOfficer: pick(["Sarah Williams", "Rylee Alcorn", "Connor Welch"] as const),
    applicationDate: new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit" }).format(now),
    queue: "Sales Support", decision: "",
  };
  document.businessRules = evaluateLoanRules(document);
  return document;
}
