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
): void | Promise<void> {
  const write = () => {
    const current = reset ? { records: [], resetToken: null } : loadClosingDisclosureHistory(loanId);
    const next = update(current);
    localStorage.setItem(closingDisclosureStorageKey(loanId), JSON.stringify(next));
    // Native storage events only reach other windows.
    window.dispatchEvent(new CustomEvent(HISTORY_CHANGED, { detail: loanId }));
  };
  if (navigator.locks?.request) {
    return navigator.locks.request(closingDisclosureStorageKey(loanId), write);
  }
  // Synchronous read/modify/write also prevents stale-snapshot loss in older browsers.
  write();
}

export function resetClosingDisclosureHistory(loanId: string, disclosureOnly = false) {
  return updateClosingDisclosureHistory(loanId, () => ({
    records: [],
    resetToken: crypto.randomUUID(),
    ...(disclosureOnly ? { resetScope: "disclosure" as const } : {}),
  }), true);
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