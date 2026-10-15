export interface ClosingDisclosureRecord {
  id: number;
  generatedAt: string;
  deliveredAt: string | null;
  borrowerDetails?: import("./closing-disclosure-borrowers").BorrowerDisclosureDetails[];
}

export function closingDisclosureStorageKey(loanId: string) {
  return `loan-closing-disclosures:${loanId}`;
}

export function loadClosingDisclosures(loanId: string): ClosingDisclosureRecord[] {
  return loadClosingDisclosureHistory(loanId).records;
}

export interface ClosingDisclosureHistory {
  records: ClosingDisclosureRecord[];
  resetToken: string | null;
  /** Absent on legacy/global resets; scoped resets must not clear other demo surfaces. */
  resetScope?: "disclosure";
}

const HISTORY_CHANGED = "closing-disclosure-history-changed";

export const DISCLOSURE_WRITES_UNSUPPORTED =
  "This browser cannot safely update Closing Disclosures because Web Locks are unavailable. Saved disclosure history has not changed. Use a browser with Web Locks support.";

export class DisclosureWritesUnsupportedError extends Error {
  constructor() {
    super(DISCLOSURE_WRITES_UNSUPPORTED);
    this.name = "DisclosureWritesUnsupportedError";
  }
}

export function supportsDisclosureWrites() {
  return typeof navigator.locks?.request === "function";
}

export function loadClosingDisclosureHistory(loanId: string): ClosingDisclosureHistory {
  const stored = JSON.parse(
    localStorage.getItem(closingDisclosureStorageKey(loanId)) ?? "[]",
  );
  // Read the original array format as well as the reset-aware envelope.
  const value: unknown = Array.isArray(stored) ? stored : stored?.records;
  const resetToken = Array.isArray(stored) ? null : stored?.resetToken;
  const resetScope = Array.isArray(stored) ? undefined : stored?.resetScope;
  if (resetScope !== undefined && resetScope !== "disclosure") {
    throw new Error("Invalid disclosure reset scope");
  }
  if (resetToken !== null && typeof resetToken !== "string") {
    throw new Error("Invalid disclosure reset token");
  }
  if (!Array.isArray(value)) throw new Error("Invalid disclosure history");
  const ids = new Set<number>();
  for (const row of value) {
    if (
      !row || !Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id) ||
      typeof row.generatedAt !== "string" || !Number.isFinite(Date.parse(row.generatedAt)) ||
      (row.deliveredAt !== null &&
        (typeof row.deliveredAt !== "string" || !Number.isFinite(Date.parse(row.deliveredAt))))
    ) throw new Error("Invalid disclosure history");
    ids.add(row.id);
  }
  return { records: value.sort((a, b) => b.id - a.id), resetToken,
    ...(resetScope === "disclosure" ? { resetScope } : {}) };
}

/** The mutation receives authoritative storage, never a consumer's stale snapshot. */
export function updateClosingDisclosureHistory(
  loanId: string,
  update: (current: ClosingDisclosureHistory) => ClosingDisclosureHistory,
  reset = false,
  signal?: AbortSignal,
  committed?: () => void,
): void | Promise<void> {
  // localStorage read/modify/write is not atomic across windows. Never run
  // the updater, reset callback, or notifications without the shared lock.
  if (!supportsDisclosureWrites()) throw new DisclosureWritesUnsupportedError();
  const write = () => {
    if (signal?.aborted) throw new Error("Demo reset cancelled");
    const current = reset ? { records: [], resetToken: null } : loadClosingDisclosureHistory(loanId);
    const next = update(current);
    localStorage.setItem(closingDisclosureStorageKey(loanId), JSON.stringify(next));
    committed?.();
    // Native storage events only reach other windows.
    window.dispatchEvent(new CustomEvent(HISTORY_CHANGED, { detail: loanId }));
  };
  return navigator.locks.request(closingDisclosureStorageKey(loanId), write);
}

export function resetClosingDisclosureHistory(
  loanId: string,
  disclosureOnly = false,
  signal?: AbortSignal,
  committed?: () => void,
) {
  return updateClosingDisclosureHistory(loanId, () => ({
    records: [],
    resetToken: crypto.randomUUID(),
    ...(disclosureOnly ? { resetScope: "disclosure" as const } : {}),
  }), true, signal, committed);
}

export function subscribeClosingDisclosureHistory(
  loanId: string,
  onChange: (removed: boolean) => void,
) {
  const storage = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== localStorage) return;
    if (event.key === null || event.key === closingDisclosureStorageKey(loanId)) {
      onChange(event.newValue === null);
    }
  };
  const local = (event: Event) => {
    if ((event as CustomEvent<string>).detail === loanId) onChange(false);
  };
  window.addEventListener("storage", storage);
  window.addEventListener(HISTORY_CHANGED, local);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(HISTORY_CHANGED, local);
  };
}