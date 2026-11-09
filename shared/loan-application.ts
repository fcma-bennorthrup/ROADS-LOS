import { evaluateJointCredit } from "./business-rules/joint-credit";
import { collateralValue, currencyAmount, loanToCollateralValue } from "./loan-collateral-value";
import { calculateSummary } from "./summary";

export type LoanApplication = import("./loan-contract").LoanDocument;

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
  loan.applicationType = evaluateJointCredit(app).showChip ? "Joint Credit Application" : "";
  const borrowers = app.borrowers.map((borrower, index) => {
    const info = app.sections[index === 0 ? "borrower-primary" : "borrower-secondary"] as Record<string, string> | undefined;
    return info ? { ...borrower, name: `${info.firstName} ${info.lastName}`.trim(),
      phone: info.phone, email: info.email } : borrower;
  });
  const details = app.sections["loan-details"] as Record<string, string> | undefined;
  if (details) {
    loan.amountRequested = String(currencyAmount(details.requestedLoanAmount) ?? 0);
    loan.displayAmount = loan.amountRequested;
    const requested = currencyAmount(details.requestedLoanAmount);
    const fees = currencyAmount(loan.financedFees);
    loan.totalLoanAmount = requested !== null && fees !== null ? String(requested + fees) : "";
    loan.loanType = ({ purchase: "Purchase", construction: "Construction", cash_out: "Cash Out", refinance: "Refinance" } as Record<string, string>)[details.loanType] ?? "";
  }
  loan.primaryBorrowerName = borrowers[0]?.name || "";
  const value = collateralValue(app.sections);
  loan.totalCv = value === null ? "" : String(value);
  loan.lcv = loanToCollateralValue(loan.totalLoanAmount, value);
  return { ...loan, borrowers, summary: calculateSummary(app) };
}
