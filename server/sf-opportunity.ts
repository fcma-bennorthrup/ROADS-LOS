import { randomInt } from "node:crypto";
import { newLoanApplication } from "../shared/loan-factory";
import { evaluateLoanRules } from "../shared/business-rules";
import { contractExpiry } from "./opportunity-expiry";
import { pick } from "../shared/loan-events/random";
import { syntheticBorrower } from "../shared/loan-events/synthetic-borrower";
import { captureBaseline } from "../shared/loan-events/baseline";
import type { LoanApplication } from "../shared/loan-application";
import { fillMissing } from "../shared/loan-events/fill-missing";

export interface KnownOpportunityValues {
  primary?: Record<string, unknown>;
  secondary?: Record<string, unknown>;
  loanDetails?: Record<string, unknown>;
  opportunity?: NonNullable<LoanApplication["meta"]>["opportunity"];
}
const nonblank = (value: unknown) => value !== undefined && value !== null &&
  !(typeof value === "string" && value.trim() === "");

/** Called while holding the creation transaction lock. Wrap rather than reuse a CIF. */
export function allocateCif(used: Set<string>, start = randomInt(100000, 1000000)): string {
  for (let offset = 0; offset < 900000; offset++) {
    const candidate = String(100000 + (start - 100000 + offset) % 900000);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("No six-digit CIFs remain available.");
}

export function newSfOpportunity(id: string, loanNumber: string, cif: string, now = new Date(), borrowerCount: 1 | 2 = 1, known: KnownOpportunityValues = {}) {
  const borrower = syntheticBorrower({ cif, now, random: randomInt, known: known.primary });
  const { firstName, lastName, phone, email } = borrower;
  const name = `${firstName} ${lastName}`;
  const amount = nonblank(known.loanDetails?.requestedLoanAmount)
    ? String(known.loanDetails!.requestedLoanAmount) : String(randomInt(1, 444100));
  const loanType = nonblank(known.loanDetails?.loanType) ? String(known.loanDetails!.loanType) : "purchase";
  const document = newLoanApplication({ id, loanNumber, source: "blank", borrowerCount: 1, now: now.toISOString() });
  Object.assign(document.loan, { cifNumber: cif, primaryBorrowerName: name,
    loanType: ({ purchase: "Purchase", construction: "Construction", cash_out: "Cash Out", refinance: "Refinance" } as Record<string, string>)[loanType] ?? loanType,
    amountRequested: amount, displayAmount: amount, totalLoanAmount: amount });
  document.borrowers = [{ ...document.borrowers[0], name, phone, email }];
  document.sections = {
    "borrower-primary": borrower,
    "loan-details": { loanType, loanPurpose: "", requestedLoanAmount: amount,
      downPaymentAmount: "", downPaymentSource: "", tellTheStory: "", intentToProceed: false, brpLoan: false },
  };
  if (borrowerCount === 2) {
    let secondary: ReturnType<typeof syntheticBorrower>;
    do {
      secondary = syntheticBorrower({ cif, now, random: randomInt, known: known.secondary });
      // Preserve legacy names even when both applicants share a full name.
      // A name-derived email cannot become distinct by redrawing random values.
      if (secondary.email === email && !nonblank(known.secondary?.email) &&
          nonblank(known.secondary?.firstName) && nonblank(known.secondary?.lastName)) {
        secondary.email = secondary.email.replace("@example.com", ".secondary@example.com");
      }
    } while ((`${secondary.firstName} ${secondary.lastName}` === name &&
        !(nonblank(known.secondary?.firstName) && nonblank(known.secondary?.lastName))) ||
      (secondary.ssn === borrower.ssn && !nonblank(known.secondary?.ssn)) ||
      (secondary.phone === phone && !nonblank(known.secondary?.phone)) ||
      (secondary.email === email && !nonblank(known.secondary?.email)));
    document.borrowers.push({
      id: `${id}-secondary`, loanId: id, isPrimary: false,
      name: `${secondary.firstName} ${secondary.lastName}`,
      phone: secondary.phone, email: secondary.email,
    });
    document.sections["borrower-secondary"] = secondary;
  }
  document.sections.income = document.borrowers.map(({ name }) => ({
    name, isPrimaryWageEarner: false, incomeSources: [],
  }));
  document.meta!.source = "sf";
  // Persist the prototype's Eastern calendar date, without browser timezone shifts.
  const opportunity = known.opportunity;
  document.meta!.opportunity = fillMissing(opportunity ?? {}, {
    region: nonblank(opportunity?.region) ? opportunity!.region : pick(randomInt, ["500", "502", "504"] as const),
    loanOfficer: nonblank(opportunity?.loanOfficer) ? opportunity!.loanOfficer : pick(randomInt, ["Sarah Williams", "Rylee Alcorn", "Connor Welch"] as const),
    applicationDate: nonblank(opportunity?.applicationDate) ? opportunity!.applicationDate : new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit" }).format(now),
    queue: "Sales Support", decision: "",
    contractExpiryDate: nonblank(opportunity?.contractExpiryDate) ? opportunity!.contractExpiryDate : contractExpiry(now.toISOString()),
  }) as NonNullable<NonNullable<LoanApplication["meta"]>["opportunity"]>;
  document.businessRules = evaluateLoanRules(document);
  document.meta!.baseline = captureBaseline(document, now);
  return document;
}
