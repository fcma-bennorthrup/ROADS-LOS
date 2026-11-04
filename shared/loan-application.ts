import type { Loan, Borrower } from "./schema";

export interface LoanApplication {
  loan: Loan;
  borrowers: Borrower[];
  mode: "existing" | "empty" | "blend";
  generation: number;
  revision: number;
  sections: Record<string, unknown>;
  changeLog?: import("./loan-history").LoanChange[];
}

/** Empty data values without removing the form's structural identifiers. */
export function emptyFields<T>(value: T): T {
  if (Array.isArray(value)) return [] as T;
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key,
      key === "id" ? item : emptyFields(item)]),
  ) as T;
  if (typeof value === "string") return "" as T;
  if (typeof value === "number") return 0 as T;
  if (typeof value === "boolean") return false as T;
  return value;
}

export function applicationView(app: LoanApplication) {
  const loan = { ...app.loan };
  const borrowers = app.borrowers.map((borrower, index) => {
    const info = app.sections[index === 0 ? "borrower-primary" : "borrower-secondary"] as Record<string, string> | undefined;
    return info ? { ...borrower, name: `${info.firstName} ${info.lastName}`.trim(),
      phone: info.phone, email: info.email } : borrower;
  });
  const details = app.sections["loan-details"] as Record<string, string> | undefined;
  if (details) {
    loan.amountRequested = String(Number(details.requestedLoanAmount.replace(/[^0-9.-]/g, "")) || 0);
    loan.displayAmount = loan.amountRequested;
    loan.totalLoanAmount = String(Number(loan.amountRequested) + Number(loan.financedFees));
    loan.loanType = ({ purchase: "Purchase", construction: "Construction", cash_out: "Cash Out", refinance: "Refinance" } as Record<string, string>)[details.loanType] ?? "";
  }
  loan.primaryBorrowerName = borrowers[0]?.name || "";
  return { ...loan, borrowers };
}
