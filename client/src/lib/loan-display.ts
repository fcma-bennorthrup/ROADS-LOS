import type { Loan, Borrower } from "@shared/schema";

export interface LoanWithBorrowers extends Loan {
  borrowers: Borrower[];
}

// Preserve the loan pages' prefix parsing, $NaN, and dollar-before-minus output.
export function formatCurrency(value: string): string {
  const num = parseFloat(value);
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
