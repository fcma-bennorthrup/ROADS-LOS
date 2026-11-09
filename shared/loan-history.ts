export interface LoanChange {
  id: number;
  field: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
  position: string;
  timestamp: string;
  section: string;
  navItem: string;
}

const sections: Record<string, string> = {
  "borrower-primary": "Borrower Information", "borrower-secondary": "Borrower Information",
  "loan-details": "Loan Details", income: "Borrower Financials",
  "current-assets": "Borrower Financials", "noncurrent-assets": "Borrower Financials",
  "current-liabilities": "Borrower Financials", "noncurrent-liabilities": "Borrower Financials",
  "subject-property": "Collateral", "evaluation-1": "Collateral", "evaluation-2": "Collateral",
  "appraisal-split": "Collateral", "pricing-type": "Product & Pricing",
  "pricing-product": "Product & Pricing", "pricing-term": "Product & Pricing",
  fees: "Fees", "closing-details": "Closing", "credit-pulled": "Decisioning",
  "booking-state": "Booking", "booking-at": "Booking",
};
const label = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const blank = (value: unknown) => value === undefined || value === null || value === "";
const display = (value: unknown): string => blank(value) ? "—"
  : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

/** Compare committed fields only. New fields/rows establish a baseline, not history.
 * Stable row ids prevent sorting or deleting a row from looking like other rows changed.
 */
export function changesForSave(key: string, previous: unknown, next: unknown,
  revision: number, timestamp = new Date().toISOString()): LoanChange[] {
  const section = sections[key];
  if (!section) return []; // Internal storage snapshots aren't user-editable fields.
  const changes: LoanChange[] = [];
  function visit(before: unknown, after: unknown, path: string) {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    if (Array.isArray(before) || Array.isArray(after)) {
      const oldRows = Array.isArray(before) ? before : [];
      const newRows = Array.isArray(after) ? after : [];
      oldRows.forEach((row, index) => {
        const match = row && typeof row === "object" && "id" in row
          ? newRows.find(item => item?.id === row.id) : newRows[index];
        visit(row, match, `${path} / Row ${index + 1}`);
      });
      return;
    }
    if ((before && typeof before === "object") || (after && typeof after === "object")) {
      const oldFields = (before ?? {}) as Record<string, unknown>;
      const newFields = (after ?? {}) as Record<string, unknown>;
      for (const field of Object.keys(oldFields)) {
        if (["id", "loanId"].includes(field)) continue;
        visit(oldFields[field], newFields[field], `${path} / ${label(field)}`);
      }
      return;
    }
    if (blank(before)) return;
    changes.push({
      id: revision * 100000 + changes.length, field: path,
      previousValue: display(before), newValue: display(after),
      changedBy: "Prototype user", position: "—", timestamp, section, navItem: section,
    });
  }
  visit(previous, next, label(key));
  return changes;
}
