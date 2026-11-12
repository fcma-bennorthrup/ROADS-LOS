import type { LoanApplication } from "../loan-application";
import { currencyAmount } from "../loan-collateral-value";

const components = ["baseEmploymentIncome", "overtime", "bonuses", "commissions", "other"];
const supplied = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== "";

/** Income components in this prototype are annual. Never trust stale derived totals over inputs. */
export function incomeSourceTotals(source: Record<string, unknown>): { yearly: number; monthly: number } | null {
  const fields = components.filter(key => supplied(source[key]));
  let yearly: number | null;
  if (fields.length) {
    const values = fields.map(key => currencyAmount(source[key]));
    yearly = values.every(value => value !== null) ? (values as number[]).reduce((a, b) => a + b, 0) : null;
  } else if (supplied(source.totalMonthlyIncome)) {
    const monthly = currencyAmount(source.totalMonthlyIncome);
    yearly = monthly === null ? null : monthly * 12;
  } else yearly = currencyAmount(source.totalYearlyIncome);
  return yearly !== null && Number.isFinite(yearly) ? { yearly, monthly: yearly / 12 } : null;
}

export function evaluatePrimaryWageEarner(app: LoanApplication) {
  const income = Array.isArray(app.sections.income) ? app.sections.income : [];
  const monthlyIncomes = app.borrowers.map((_, index): number | null => {
    const sources = income[index]?.incomeSources;
    if (index === 1 && (sources == null || (Array.isArray(sources) && !sources.length))) return 0;
    if (!Array.isArray(sources) || !sources.length) return null;
    let sum = 0;
    for (const source of sources) {
      if (!source || typeof source !== "object" || source.currentJob === "No") return null;
      const totals = incomeSourceTotals(source);
      if (!totals) return null;
      sum += totals.monthly;
    }
    return Number.isFinite(sum) ? sum : null;
  });
  let borrowerIndex: number | null = null;
  if (monthlyIncomes.length && monthlyIncomes.every(value => value !== null)) {
    // Equal incomes use the first borrower, keeping the result deterministic.
    borrowerIndex = monthlyIncomes.reduce((best, value, index) =>
      value! > monthlyIncomes[best]! ? index : best, 0);
  }
  const borrowerId = borrowerIndex === null ? null : app.borrowers[borrowerIndex].id;
  const scores = app.sections["credit-scores"] as Record<string, unknown> | undefined;
  const score = borrowerId ? scores?.[borrowerId] : null;
  const creditScore = app.sections["credit-pulled"] === true && typeof score === "number"
    && Number.isInteger(score) && score >= 300 && score <= 850 ? score : null;
  return { borrowerIndex, borrowerId, monthlyIncomes, creditScore };
}
