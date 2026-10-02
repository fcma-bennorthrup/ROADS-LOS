export interface ClosingDisclosureRecord {
  id: number;
  generatedAt: string;
  deliveredAt: string | null;
}

export function closingDisclosureStorageKey(loanId: string) {
  return `loan-closing-disclosures:${loanId}`;
}

export function loadClosingDisclosures(loanId: string): ClosingDisclosureRecord[] {
  const value: unknown = JSON.parse(
    localStorage.getItem(closingDisclosureStorageKey(loanId)) ?? "[]",
  );
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
  return value.sort((a, b) => b.id - a.id);
}