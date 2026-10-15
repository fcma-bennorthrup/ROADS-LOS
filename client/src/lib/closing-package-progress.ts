export interface ClosingPackageProgress {
  generatedAt: string | null;
  deliveredAt: string | null;
  generatingUntil: string | null;
  /** Absent on legacy progress; identifies a generation independently of its deadline. */
  operationId?: string;
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
const PACKAGE_CHANGED = "closing-package-progress-changed";
const resetVersions = new Map<string, number>();

function resetVersion(loanId: string) {
  return resetVersions.get(loanId) ?? 0;
}

/** Notify mounted timers synchronously, but only after removal succeeds. */
export function resetClosingPackageProgress(loanId: string) {
  localStorage.removeItem(closingPackageStorageKey(loanId));
  resetVersions.set(loanId, resetVersion(loanId) + 1);
  window.dispatchEvent(new CustomEvent(PACKAGE_RESET, { detail: loanId }));
}

export function subscribeClosingPackageReset(loanId: string, reset: () => void) {
  const listener = (event: Event) => {
    if ((event as CustomEvent<string>).detail === loanId) reset();
  };
  window.addEventListener(PACKAGE_RESET, listener);
  return () => window.removeEventListener(PACKAGE_RESET, listener);
}

/** Read inside the lock, and never write a consumer-local full snapshot. */
export function updateClosingPackageProgress(
  loanId: string,
  update: (current: ClosingPackageProgress) => ClosingPackageProgress | null,
): void | Promise<void> {
  const version = resetVersion(loanId);
  const write = () => {
    // Reset remains synchronous; a previously queued mutation must not undo it.
    if (version !== resetVersion(loanId)) return;
    const current = loadClosingPackageProgress(loanId);
    const next = update(current);
    if (next) localStorage.setItem(closingPackageStorageKey(loanId), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PACKAGE_CHANGED, { detail: loanId }));
  };
  if (navigator.locks?.request) {
    // Capture only operation identity, not the fields to write. A queued action
    // may merge a newer delivery, but cannot act on a removed/replaced package.
    const expected = loadClosingPackageProgress(loanId);
    return navigator.locks.request(closingPackageStorageKey(loanId), () => {
      if (version !== resetVersion(loanId)) return;
      const current = loadClosingPackageProgress(loanId);
      if (current.operationId !== expected.operationId ||
        current.generatedAt !== expected.generatedAt ||
        current.generatingUntil !== expected.generatingUntil) {
        window.dispatchEvent(new CustomEvent(PACKAGE_CHANGED, { detail: loanId }));
        return;
      }
      write();
    }).catch((error: unknown) => {
      // A reset already invalidated this queued request; a late lock rejection
      // must not put the newly reset view back into an error state.
      if (version === resetVersion(loanId)) throw error;
    });
  }
  // Atomic within one JS context, but intentionally best effort across windows.
  write();
}

export function subscribeClosingPackageProgress(loanId: string, changed: () => void) {
  const local = (event: Event) => {
    if ((event as CustomEvent<string>).detail === loanId) changed();
  };
  const storage = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== localStorage) return;
    if (event.key !== null && event.key !== closingPackageStorageKey(loanId)) return;
    // Ignore event payloads: delayed notifications must never restore older state.
    changed();
  };
  window.addEventListener(PACKAGE_CHANGED, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(PACKAGE_CHANGED, local);
    window.removeEventListener("storage", storage);
  };
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
    (row.operationId !== undefined && (typeof row.operationId !== "string" || !row.operationId)) ||
    (row.deliveredAt !== null && row.generatedAt === null)
  ) throw new Error("Invalid package progress");
  return {
    generatedAt: row.generatedAt,
    deliveredAt: row.deliveredAt,
    generatingUntil: row.generatingUntil,
    ...(row.operationId !== undefined ? { operationId: row.operationId } : {}),
  };
}