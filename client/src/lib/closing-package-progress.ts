export interface ClosingPackageProgress {
  generatedAt: string | null;
  deliveredAt: string | null;
  generatingUntil: string | null;
}

export const emptyClosingPackageProgress = (): ClosingPackageProgress => ({
  generatedAt: null,
  deliveredAt: null,
  generatingUntil: null,
});

export function closingPackageStorageKey(loanId: string) {
  return `loan-closing-package:${loanId}`;
}

export function loadClosingPackageProgress(loanId: string): ClosingPackageProgress {
  const saved = localStorage.getItem(closingPackageStorageKey(loanId));
  if (saved === null) return emptyClosingPackageProgress();
  const value: unknown = JSON.parse(saved);
  const isDate = (date: unknown) =>
    date === null || (typeof date === "string" && Number.isFinite(Date.parse(date)));
  if (!value || typeof value !== "object") throw new Error("Invalid package progress");
  const row = value as ClosingPackageProgress;
  if (
    !isDate(row.generatedAt) || !isDate(row.deliveredAt) || !isDate(row.generatingUntil) ||
    (row.deliveredAt !== null && row.generatedAt === null)
  ) throw new Error("Invalid package progress");
  return {
    generatedAt: row.generatedAt,
    deliveredAt: row.deliveredAt,
    generatingUntil: row.generatingUntil,
  };
}