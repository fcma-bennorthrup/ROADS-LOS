import type { LoanApplication } from "./loan-application";
import { collateralValue, loanToCollateralValue } from "./loan-collateral-value";
import { calculateSummaryPayments } from "./summary-payments";
import { calculateSummaryIncomeDebt } from "./summary-income-debt";
import { calculateSummaryCash } from "./summary-cash";

export interface PitiBreakdown {
  /** First scheduled payment; not an average over the loan term. */
  principal: number | null;
  interest: number | null;
  taxes: number | null;
  insurance: number | null;
  totalHousingCosts: number | null;
  grossMonthlyIncome: number | null;
  percentage: number | null;
}

/** Pure saved-data Summary projection. Never falls back to legacy demo columns. */
export function calculateSummary(app: LoanApplication) {
  const payments = calculateSummaryPayments(app);
  const incomeDebt = calculateSummaryIncomeDebt(app, payments.totalMonthlyPayment);
  const cash = calculateSummaryCash(app);
  const totalCv = collateralValue(app.sections);
  const lcv = loanToCollateralValue(payments.totalLoanAmount, totalCv);
  const rawInterest = payments.principalInterest !== null
    && payments.totalLoanAmount !== null && payments.finalRate !== null
    ? payments.totalLoanAmount * payments.finalRate / 1200 : null;
  const interest = rawInterest !== null && Number.isFinite(rawInterest) ? rawInterest : null;
  const principal = payments.principalInterest !== null && interest !== null
    ? payments.principalInterest - interest : null;
  const pitiBreakdown: PitiBreakdown = {
    principal, interest,
    // Recurring tax and insurance inputs do not exist in the saved contract.
    taxes: null, insurance: null,
    totalHousingCosts: payments.totalMonthlyPayment,
    grossMonthlyIncome: incomeDebt.monthlyIncome,
    percentage: incomeDebt.piti,
  };
  return {
    ...payments, ...incomeDebt, ...cash,
    totalCv, lcv: lcv === "" ? null : Number(lcv), pitiBreakdown,
    missing: Array.from(new Set([
      ...payments.missing, ...incomeDebt.missing, ...cash.missing,
      ...(totalCv === null ? ["Total CV: a positive saved estimated or reported collateral value is required for every active evaluation."] : []),
      ...(lcv === "" ? ["L/CV: authoritative total loan amount and positive total collateral value are required."] : []),
    ])),
  };
}

export type LoanSummary = ReturnType<typeof calculateSummary>;
