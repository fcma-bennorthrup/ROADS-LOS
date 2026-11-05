/** Currency fields accept saved numeric values and formatted user input. */
export function currencyAmount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).replace(/[$,\s]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function collateralValue(sections: Record<string, unknown>): number | null {
  const keys = sections["appraisal-split"] === true ? ["evaluation-1", "evaluation-2"] : ["evaluation-1"];
  let total = 0;
  for (const key of keys) {
    const evaluation = sections[key] as Record<string, unknown> | undefined;
    const reported = currencyAmount(evaluation?.reportedValueTotal);
    const estimated = currencyAmount(evaluation?.estimatedValue);
    const hasReport = evaluation?.reportedValueTotal !== undefined &&
      evaluation.reportedValueTotal !== null && String(evaluation.reportedValueTotal).trim() !== "";
    const value = hasReport ? reported : estimated;
    if (value === null || value <= 0) return null;
    total += value;
  }
  return Number.isFinite(total) ? total : null;
}

export function loanToCollateralValue(totalLoanAmount: unknown, value: number | null): string {
  const total = currencyAmount(totalLoanAmount);
  if (total === null || total <= 0 || value === null || value <= 0) return "";
  const ratio = total / value * 100;
  return Number.isFinite(ratio) ? ratio.toFixed(2) : "";
}
