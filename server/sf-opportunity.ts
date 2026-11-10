import { randomInt } from "node:crypto";
import { newLoanApplication } from "../shared/loan-factory";
import { evaluateLoanRules } from "../shared/business-rules";
import { contractExpiry } from "./opportunity-expiry";

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
  const location = pick([
    { city: "Louisville", state: "KY", zip: "40202", areaCode: "502" },
    { city: "Indianapolis", state: "IN", zip: "46204", areaCode: "317" },
    { city: "Columbus", state: "OH", zip: "43215", areaCode: "614" },
  ]);
  // Deliberately synthetic identifiers and contact details, generated once at creation.
  const phone = `(${location.areaCode}) 555-${randomInt(100, 200).toString().padStart(4, "0")}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${cif}@example.com`;
  const dob = `${now.getUTCFullYear() - randomInt(25, 66)}-${String(randomInt(1, 13)).padStart(2, "0")}-${String(randomInt(1, 29)).padStart(2, "0")}`;
  const amount = String(randomInt(1, 444100));
  const document = newLoanApplication({ id, loanNumber, source: "blank", borrowerCount: 1, now: now.toISOString() });
  Object.assign(document.loan, { cifNumber: cif, primaryBorrowerName: name,
    loanType: "Purchase", amountRequested: amount, displayAmount: amount, totalLoanAmount: amount });
  document.borrowers = [{ ...document.borrowers[0], name, phone, email }];
  document.sections = {
    "borrower-primary": { firstName, lastName, ssn: `000-${randomInt(10, 100)}-${String(randomInt(0, 10000)).padStart(4, "0")}`, dob, phone, email,
      address: `${randomInt(100, 1000)} Example Lane`, city: location.city, state: location.state, zip: location.zip, maritalStatus: "", dependents: "",
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
    contractExpiryDate: contractExpiry(now.toISOString()),
  };
  document.businessRules = evaluateLoanRules(document);
  return document;
}
