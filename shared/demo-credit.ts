import { applicationView, type LoanApplication } from "./loan-application";
import { evaluateLoanRules } from "./business-rules";
import { isCreditFrozen, CREDIT_FROZEN_MESSAGE } from "./business-rules/credit-freeze";

/** Synthetic credit accounts, not a bureau integration. Existing entries are preserved. */
export function populateDemoCredit(current: LoanApplication): LoanApplication {
  if (isCreditFrozen(current)) throw new Error(CREDIT_FROZEN_MESSAGE);
  if (current.sections["credit-pulled"] === true && current.sections["credit-scores"]) return current;
  const borrowers = applicationView(current).borrowers.filter(b => b.name.trim());
  if (!borrowers.length) throw new Error("Add borrower information before pulling credit.");
  const sections = { ...current.sections };
  for (const [key, types] of [
    ["current-liabilities", ["Credit Card", "Personal Loan"]],
    ["noncurrent-liabilities", ["Auto Loan", "Student Loan"]],
  ] as const) {
    const existing = (sections[key] ?? []) as { id: string }[];
    const additions = borrowers.flatMap((borrower, index) => types.map((type, account) => ({
      id: `credit-${borrower.id}-${type.toLowerCase().replaceAll(" ", "-")}`,
      borrowerId: borrower.id,
      borrowerName: borrower.name,
      liabilityType: type,
      creditorName: ({
        "Credit Card": "Demo Card Services", "Personal Loan": "Demo Community Bank",
        "Auto Loan": "Demo Auto Finance", "Student Loan": "Demo Education Finance",
      })[type],
      accountNumber: `DEMO-${index + 1}-${key === "current-liabilities" ? "10" : "20"}${account + 1}`,
      unpaidBalance: String((type === "Credit Card" ? 2400 : type === "Personal Loan" ? 5000 : type === "Auto Loan" ? 18000 : 12000) + index * 1000),
      monthlyPayment: String((type === "Credit Card" ? 85 : type === "Personal Loan" ? 175 : type === "Auto Loan" ? 425 : 150) + index * 25),
      toBePaidOff: "No",
    })));
    sections[key] = [...existing, ...additions.filter(row => !existing.some(old => old.id === row.id))];
  }
  sections["credit-pulled"] = true;
  // Synthetic hard-pull results, keyed to borrowers, never to income rank.
  sections["credit-scores"] = Object.fromEntries(borrowers.map((borrower, index) => [borrower.id, index === 0 ? 742 : 718]));
  const next = { ...current, sections, revision: current.revision + 1 };
  next.businessRules = evaluateLoanRules(next);
  return next;
}
