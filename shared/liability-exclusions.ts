export const LIABILITY_EXCLUSIONS = [
  "Not excluded",
  "Debt will be refinanced into this deal",
  "Already paid in full",
  "Less than 10 months left",
  "Paid by someone else",
  "Error on credit report",
  "T&I included in 1st lien",
  "Will be paid in full before closing",
] as const;

export function liabilityExclusionLabel(row: { exclusion?: string; toBePaidOff?: string }): string {
  return row.exclusion ?? (row.toBePaidOff === "Yes" ? "Will be paid in full before closing" : "Not excluded");
}
