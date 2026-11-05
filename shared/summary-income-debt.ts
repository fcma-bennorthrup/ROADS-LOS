import type { LoanApplication } from "./loan-application";
import { currencyAmount } from "./loan-collateral-value";

export interface SummaryIncomeDebt {
  /** Complete monthly housing costs / combined gross monthly income * 100. */
  piti: number | null;
  dti: number | null;
  monthlyIncome: number | null;
  /** Liabilities only; excludes the supplied proposed housing payment. */
  monthlyDebt: number | null;
  missing: string[];
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function supplied(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

const COMPONENTS = ["baseEmploymentIncome", "overtime", "bonuses", "commissions", "other"] as const;

/**
 * Saved-data prototype, not an underwriting qualification calculation.
 *
 * User-confirmed PITI = monthly principal + interest + taxes + insurance,
 * divided by combined gross monthly borrower income, multiplied by 100.
 * The caller must supply that complete housing payment in dollars. DTI adds retained liabilities
 * to that payment and is a percentage (25, not .25), without UI rounding.
 *
 * Income is positional, like BorrowerFinancialsContent: income[0] is primary,
 * income[1] secondary. Prefer saved totalMonthlyIncome, then totalYearlyIncome
 * / 12, then annual components / 12 (the existing income editor's convention).
 * There is no saved pay-frequency field: no weekly/hourly conversion is guessed.
 * Blank optional components contribute zero only if another component is explicit.
 * A blank borrower/source is unknown, not an assertion of zero income.
 *
 * Both balance-sheet arrays are loan-wide, not per-borrower. Count each row once.
 * "To Be Paid Off" describes intent, not a confirmed payoff: rows marked Yes
 * make debt unknown until the user confirms their exclusion policy. Never add
 * such a row to housing blindly, nor silently exclude it. Do not infer payments from unpaid balances,
 * guess joint-account identity from names, or subtract an unidentified mortgage.
 * Duplicate IDs and historical-job income require clarification rather than an
 * invented deduplication/qualification policy. Independent known totals survive
 * other missing inputs; incomplete totals and their dependent ratios are null.
 */
export function calculateSummaryIncomeDebt(
  app: LoanApplication,
  housingPayment: number | null,
): SummaryIncomeDebt {
  const missing: string[] = [];
  const income = app.sections.income;
  let incomeTotal = 0;
  let incomeComplete = true;
  const incomeMissing = (message: string) => {
    missing.push(message);
    incomeComplete = false;
  };

  if (!Array.isArray(income) || app.borrowers.length === 0) {
    incomeMissing("Income: saved borrower income is missing.");
  } else {
    if (income.length > app.borrowers.length)
      incomeMissing("Income: extra borrower records cannot be attributed to an active borrower.");
    app.borrowers.forEach((_, borrowerIndex) => {
      const label = `Income borrower ${borrowerIndex + 1}`;
      const sources = record(income[borrowerIndex]).incomeSources;
      if (!Array.isArray(sources) || sources.length === 0) {
        incomeMissing(`${label}: income sources are missing; zero income must be explicit.`);
        return;
      }
      sources.forEach((value, sourceIndex) => {
        const source = record(value);
        const path = `${label}, source ${sourceIndex + 1}`;
        if (source.currentJob === "No") {
          incomeMissing(`${path}: historical-job income qualification is unsupported.`);
          return;
        }
        // An invalid explicit total must not silently fall back to another field.
        let monthly: number | null;
        if (supplied(source.totalMonthlyIncome)) {
          monthly = currencyAmount(source.totalMonthlyIncome);
        } else if (supplied(source.totalYearlyIncome)) {
          const yearly = currencyAmount(source.totalYearlyIncome);
          monthly = yearly === null ? null : yearly / 12;
        } else {
          const components = COMPONENTS.filter(key => supplied(source[key]));
          const amounts = components.map(key => currencyAmount(source[key]));
          monthly = components.length > 0 && amounts.every(amount => amount !== null)
            ? (amounts as number[]).reduce((sum, amount) => sum + amount, 0) / 12 : null;
        }
        if (monthly === null || !Number.isFinite(monthly))
          incomeMissing(`${path}: valid monthly income or annual income is missing; unsupported pay-frequency conversions are not inferred.`);
        else incomeTotal += monthly;
      });
    });
  }

  let debtTotal = 0;
  let debtComplete = true;
  const ids = new Set<string>();
  for (const key of ["current-liabilities", "noncurrent-liabilities"]) {
    const rows = app.sections[key];
    if (!Array.isArray(rows)) {
      missing.push(`${key}: saved liabilities are missing; an empty array explicitly means none.`);
      debtComplete = false;
      continue;
    }
    rows.forEach((value, index) => {
      const row = record(value);
      const path = `${key}, row ${index + 1}`;
      const id = typeof row.id === "string" ? row.id.trim() : "";
      if (id && ids.has(id)) {
        missing.push(`${path}: duplicate liability ID; account reconciliation is unsupported.`);
        debtComplete = false;
        return;
      }
      if (id) ids.add(id);
      if (row.toBePaidOff === "Yes") {
        missing.push(`${path}: planned-payoff debt exclusion requires a confirmed policy.`);
        debtComplete = false;
        return;
      }
      if (row.toBePaidOff !== "No") {
        missing.push(`${path}: paid-off status must be Yes or No.`);
        debtComplete = false;
        return;
      }
      const payment = currencyAmount(row.monthlyPayment);
      if (payment === null) {
        missing.push(`${path}: valid monthly payment is missing; balance-to-payment conversion is unsupported.`);
        debtComplete = false;
      } else debtTotal += payment;
    });
  }

  if (!Number.isFinite(incomeTotal)) {
    incomeMissing("Income: total exceeds the supported numeric range.");
  }
  if (!Number.isFinite(debtTotal)) {
    missing.push("Liabilities: total exceeds the supported numeric range.");
    debtComplete = false;
  }
  const monthlyIncome = incomeComplete ? incomeTotal : null;
  const monthlyDebt = debtComplete ? debtTotal : null;
  const housing = typeof housingPayment === "number" && Number.isFinite(housingPayment) && housingPayment >= 0
    ? housingPayment : null;
  if (housing === null) missing.push("Housing: complete proposed monthly housing payment is missing or invalid.");
  if (monthlyIncome === 0) missing.push("Income: positive gross monthly income is required for ratios.");
  const percentage = (amount: number | null): number | null => {
    if (amount === null || monthlyIncome === null || monthlyIncome <= 0) return null;
    const result = amount / monthlyIncome * 100;
    if (Number.isFinite(result)) return result;
    missing.push("Ratio exceeds the supported numeric range.");
    return null;
  };
  return {
    piti: percentage(housing),
    dti: percentage(housing !== null && monthlyDebt !== null ? housing + monthlyDebt : null),
    monthlyIncome,
    monthlyDebt,
    missing: Array.from(new Set(missing)),
  };
}
