import type { LoanApplication } from "../loan-application";
import { currencyAmount } from "../loan-collateral-value";
import type { FeeRow } from "../fees";

/** Seed once per application. A user's later edits, waiver, or deletion win. */
export function withOriginationFee(app: LoanApplication): LoanApplication {
  if (app.sections["origination-fee-initialized"] === true) return app;
  const details = app.sections["loan-details"] as Record<string, unknown> | undefined;
  const amount = currencyAmount(details ? details.requestedLoanAmount : app.loan.amountRequested);
  if (amount === null || amount <= 0) return app;
  const fees = Array.isArray(app.sections.fees) ? app.sections.fees as FeeRow[] : [];
  const existing = fees.some(row => row.fee?.trim().toLowerCase() === "origination fee");
  const feeAmount = (Math.round(Math.min(amount * 0.01, 1000) * 100) / 100).toFixed(2);
  return {
    ...app,
    sections: {
      ...app.sections,
      "origination-fee-initialized": true,
      fees: existing ? fees : [...fees, {
        id: `auto-origination-${app.generation}`, fee: "Origination Fee",
        leAmount: feeAmount, cdAmount: feeAmount,
        methodOfPayment: "Cash", paidBy: "Buyer", paidTo: "",
        shoppedForProvider: false, waived: false,
      }],
    },
  };
}
