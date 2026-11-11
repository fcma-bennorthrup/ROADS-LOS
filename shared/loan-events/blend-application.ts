import type { LoanApplication } from "../loan-application";
import { evaluateLoanRules } from "../business-rules";
import { incomeSourceTotals } from "../business-rules/primary-wage-earner";
import { withOriginationFee } from "../business-rules/origination-fee";
import { currencyAmount } from "../loan-collateral-value";
import { fillMissing } from "./fill-missing";
import { syntheticBorrower } from "./synthetic-borrower";
import { pick, type RandomInt } from "./random";

const blank = (value: unknown) => value == null || (typeof value === "string" && !value.trim());
const record = (value: unknown): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const money = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const addresses = [
  { city: "Louisville", county: "Jefferson", state: "KY", zip: "40202" },
  { city: "Indianapolis", county: "Marion", state: "IN", zip: "46204" },
  { city: "Columbus", county: "Franklin", state: "OH", zip: "43215" },
];
const personalKeys = ["firstName", "lastName", "ssn", "dob", "phone", "email", "address", "city", "state", "zip",
  "maritalStatus", "dependents", "dependentsAges", "farmInvolvement"];
const emptyPersonal = () => Object.fromEntries(personalKeys.map(key => [key, ""]));

export function applyBlendApplication(current: LoanApplication, { borrowerCount, random, now }: {
  borrowerCount: 1 | 2; random: RandomInt; now: Date;
}): LoanApplication {
  let next = structuredClone(current);
  const sections = next.sections;
  const rowId = (prefix: string) => {
    let id = `${current.loan.id}-blend-${current.generation}-${prefix}`;
    const ids = new Set(Object.values(sections).flatMap(value =>
      Array.isArray(value) ? value.map(row => record(row).id) : []));
    let suffix = 1;
    while (ids.has(id)) id = `${current.loan.id}-blend-${current.generation}-${prefix}-${suffix++}`;
    return id;
  };
  if (borrowerCount === 2 && next.borrowers.length === 1) {
    const identity = syntheticBorrower({ cif: next.loan.cifNumber, random, now });
    next.borrowers.push({ id: `${next.loan.id}-secondary`, loanId: next.loan.id, isPrimary: false,
      name: `${identity.firstName} ${identity.lastName}`, email: identity.email, phone: identity.phone });
    sections["borrower-secondary"] = identity;
  }
  for (let index = 0; index < Math.min(2, next.borrowers.length); index++) {
    const key = index === 0 ? "borrower-primary" : "borrower-secondary";
    if (index >= borrowerCount) {
      if (blank(sections[key])) sections[key] = emptyPersonal();
      continue;
    }
    const existing = record(sections[key]);
    const identity = syntheticBorrower({ cif: next.loan.cifNumber, random, now, known: existing });
    const incoming: Record<string, unknown> = { ...identity, maritalStatus: "married",
      farmInvolvement: pick(random, ["none", "part_time", "full_time"]), mla: false };
    // Never construct a mixed address from an incomplete existing address.
    if (!["address", "city", "state", "zip"].every(field => blank(existing[field]))) {
      for (const field of ["address", "city", "state", "zip"]) delete incoming[field];
    }
    if (blank(existing.dependents)) {
      const count = random(0, 4);
      incoming.dependents = String(count);
      incoming.dependentsAges = Array.from({ length: count }, () => random(1, 18)).join(", ");
    } else {
      delete incoming.dependents;
      delete incoming.dependentsAges;
    }
    sections[key] = fillMissing(existing, incoming);
  }
  const details = record(sections["loan-details"]);
  const amount = currencyAmount(details.requestedLoanAmount) ?? currencyAmount(next.loan.amountRequested) ?? 0;
  sections["loan-details"] = fillMissing(details, {
    loanPurpose: "primary_dwelling",
    downPaymentAmount: `$${money(Math.round(amount * random(5, 26) / 100 / 500) * 500)}`,
    downPaymentSource: "cash_on_hand", tellTheStory: "Synthetic Blend application generated for prototype testing.",
  });
  const income = Array.isArray(sections.income) ? sections.income : [];
  sections.income = next.borrowers.map((borrower, index) => {
    const saved = record(income[index]);
    const base = fillMissing(saved, { name: borrower.name, isPrimaryWageEarner: false, incomeSources: [] });
    if (index >= borrowerCount || (Array.isArray(base.incomeSources) && base.incomeSources.length)) return base;
    const location = pick(random, addresses);
    const years = random(1, 16);
    const source = {
      id: `${borrower.id}-blend-income-${current.generation}`,
      incomeType: "W2", employer: pick(random, ["Demo Meadow Services", "Demo Valley Workshop", "Demo Orchard Supply"]),
      titlePosition: "Specialist", currentJob: "Yes", startDate: `${now.getUTCFullYear() - years}-01-01`,
      endDate: "", yearsEmployed: String(years), yearsInLineOfWork: String(years),
      address1: `${random(100, 1000)} Example Lane`, address2: "",
      city: location.city, state: location.state, zip: location.zip,
      phone: `(502) 555-${random(100, 200).toString().padStart(4, "0")}`,
      baseEmploymentIncome: money(random(45, 151) * 1000), overtime: "0.00",
      bonuses: "0.00", commissions: "0.00", other: "0.00",
      totalMonthlyIncome: "", totalYearlyIncome: "",
    };
    const totals = incomeSourceTotals(source)!;
    source.totalMonthlyIncome = `$${money(totals.monthly)}`;
    source.totalYearlyIncome = `$${money(totals.yearly)}`;
    return { ...base, incomeSources: [source] };
  });
  for (const key of ["current-assets", "noncurrent-assets"]) {
    const rows = Array.isArray(sections[key]) ? sections[key] as Record<string, unknown>[] : [];
    sections[key] = rows;
    for (const [index, borrower] of next.borrowers.slice(0, borrowerCount).entries()) {
      if (rows.some(row => row.borrowerId === borrower.id || (!row.borrowerId && index === 0))) continue;
      const count = key === "current-assets" ? random(1, 3) : 1;
      for (let n = 0; n < count; n++) rows.push({
        id: rowId(`${key}-${borrower.id}-${n}`), borrowerId: borrower.id,
        assetType: key === "current-assets" ? "Checking Account" : "Retirement",
        financialInstitution: "Demo Community Bank", accountNumber: String(random(100000000, 1000000000)),
        cashOrMarketValue: money(random(10, 101) * 1000),
      });
    }
  }
  for (const key of ["current-liabilities", "noncurrent-liabilities", "fees"]) {
    if (blank(sections[key])) sections[key] = [];
  }
  const property = record(sections["subject-property"]);
  const incomingProperty: Record<string, unknown> = { collateralOwnerId: next.borrowers[0]?.id,
    monthlyPropertyTaxes: "", monthlyInsurance: "" };
  if (["address1", "city", "state", "zip"].every(field => blank(property[field]))) {
    Object.assign(incomingProperty, pick(random, addresses), { address1: `${random(100, 1000)} Example Lane`, address2: "" });
  }
  sections["subject-property"] = fillMissing(property, incomingProperty);
  next.mode = "blend";
  next = withOriginationFee(next);
  // A repeated import must not refresh rule timestamps or produce a new revision.
  if (JSON.stringify(next) === JSON.stringify(current)) return current;
  next.businessRules = evaluateLoanRules(next, now.toISOString());
  next.revision = current.revision + 1;
  return next;
}
