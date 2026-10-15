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

const PACKAGE_RESET = "closing-package-demo-reset";

/** Notify mounted timers synchronously, but only after removal succeeds. */
export function resetClosingPackageProgress(loanId: string) {
  localStorage.removeItem(closingPackageStorageKey(loanId));
  window.dispatchEvent(new CustomEvent(PACKAGE_RESET, { detail: loanId }));
}

export function subscribeClosingPackageReset(loanId: string, reset: () => void) {
  const listener = (event: Event) => {
    if ((event as CustomEvent<string>).detail === loanId) reset();
  };
  window.addEventListener(PACKAGE_RESET, listener);
  return () => window.removeEventListener(PACKAGE_RESET, listener);
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