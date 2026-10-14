import type { Borrower } from "@shared/schema";
import {
  loadClosingDisclosureHistory, updateClosingDisclosureHistory,
  type ClosingDisclosureRecord,
} from "./closing-disclosure-history";

export type DisclosureBorrower = Pick<Borrower, "id" | "name" | "isPrimary">;
export type BorrowerDisclosureDetails = {
  borrowerId: string;
  deliveryMethod: "" | "Blend" | "Mail" | "Hand Delivery";
  deliveryDate: string;
  cdViewed: "" | "Yes" | "No";
  viewedDate: string;
};
export type DisclosureEditSnapshot = {
  loanId: string;
  id: number;
  generatedAt: string;
  resetToken: string | null;
  baseline: BorrowerDisclosureDetails[];
};
const fields = ["deliveryMethod", "deliveryDate", "cdViewed", "viewedDate"] as const;

export function blankBorrowerDetails(borrowerId: string): BorrowerDisclosureDetails {
  return { borrowerId, deliveryMethod: "", deliveryDate: "", cdViewed: "", viewedDate: "" };
}

/** User-approved non-ROR prototype rule; never change individual viewing records. */
export function summarizeBorrowerViewing(details: readonly BorrowerDisclosureDetails[]) {
  const confirmed = details.filter((item) => item.cdViewed === "Yes").length;
  const total = details.length;
  const allUnrecorded = total > 0 && details.every((item) => !item.cdViewed);
  const requirementMet = confirmed > 0;
  const summary = !total ? "No borrowers" : allUnrecorded ? "Not recorded"
    : `${confirmed} of ${total} viewed · ${requirementMet ? "Requirement met" : "Viewing needed"}`;
  return { confirmed, total, allUnrecorded, requirementMet, summary };
}

export function borrowerViewingBadge(detail: BorrowerDisclosureDetails, requirementMet: boolean) {
  if (detail.cdViewed === "Yes") return { label: "Viewed", tone: "success" };
  if (requirementMet) return { label: detail.cdViewed === "No" ? "Not viewed" : "Not recorded", tone: "neutral" };
  return { label: "Viewing Needed", tone: "pending" };
}

export function hasSharedDelivery(details: readonly BorrowerDisclosureDetails[], sourceId?: string) {
  const source = details.find((item) => item.borrowerId === sourceId);
  if (details.length < 2 || !source?.deliveryMethod || !source.deliveryDate) return false;
  return details.every((item) => item.deliveryMethod === source.deliveryMethod && item.deliveryDate === source.deliveryDate);
}

export function isCalendarDate(value: unknown): value is string {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Keep bad manual metadata isolated from the protected toolbar's history reader. */
export function readBorrowerDetails(record: ClosingDisclosureRecord): BorrowerDisclosureDetails[] {
  const value: unknown = record.borrowerDetails;
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Saved borrower details could not be read. Close the editor and check the saved data.");
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item.borrowerId !== "string" || !item.borrowerId || ids.has(item.borrowerId) ||
      !["", "Blend", "Mail", "Hand Delivery"].includes(item.deliveryMethod) ||
      !["", "Yes", "No"].includes(item.cdViewed) ||
      !isCalendarDate(item.deliveryDate) || !isCalendarDate(item.viewedDate)) {
      throw new Error("Saved borrower details could not be read. Close the editor and check the saved data.");
    }
    ids.add(item.borrowerId);
  }
  return value.map((item) => ({ ...item }));
}

export function detailsForBorrowers(record: ClosingDisclosureRecord, borrowers: DisclosureBorrower[]) {
  const saved = readBorrowerDetails(record);
  // Unmatched IDs (including old random demo IDs) remain saved, not reassigned by name.
  return borrowers.map((borrower) => saved.find((item) => item.borrowerId === borrower.id) ?? blankBorrowerDetails(borrower.id));
}

/** Use the user's local calendar day, not the UTC day of an ISO timestamp. */
export function localCalendarDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Add calendar days to a date-only value, without elapsed-hour or DST arithmetic. */
export function assumedDeliveryCalendarDate(deliveryDate: string): string {
  if (deliveryDate === "") return "";
  if (!isCalendarDate(deliveryDate)) throw new Error("Delivery date could not be read.");
  const date = new Date(`${deliveryDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 3);
  const result = date.toISOString().split("T")[0];
  if (!isCalendarDate(result)) throw new Error("Assumed delivery date is outside the supported calendar format.");
  return result;
}

/** Read-only display: borrower dates are authoritative, with the existing legacy fallback. */
export function summarizeAssumedDeliveryDate(record: ClosingDisclosureRecord, details: BorrowerDisclosureDetails[]) {
  if (!record.deliveredAt) return "";
  const shifted = details.map((item) => ({
    ...item, deliveryDate: assumedDeliveryCalendarDate(item.deliveryDate),
  }));
  const summary = summarizeBorrowerField(shifted, "deliveryDate");
  if (summary) return summary;
  const delivered = new Date(record.deliveredAt);
  if (!Number.isFinite(delivered.getTime())) throw new Error("Delivery timestamp could not be read.");
  return formatCalendarDate(assumedDeliveryCalendarDate(localCalendarDate(delivered)));
}

/** Called inside the authoritative history update, preserving latest viewing details. */
export function withBorrowerDelivery(
  record: ClosingDisclosureRecord, borrowerIds: readonly string[], deliveredAt: string, deliveryDate: string,
): ClosingDisclosureRecord {
  if (!borrowerIds.length) return { ...record, deliveredAt };
  const ids = new Set(borrowerIds);
  if (ids.size !== borrowerIds.length || borrowerIds.some((id) => typeof id !== "string" || !id)) {
    throw new Error("Borrower identities could not be read.");
  }
  const details = readBorrowerDetails(record);
  const updated = details.map((item) => ids.has(item.borrowerId)
    ? { ...item, deliveryMethod: "Blend" as const, deliveryDate }
    : item);
  for (const borrowerId of borrowerIds) {
    if (!details.some((item) => item.borrowerId === borrowerId)) {
      updated.push({ ...blankBorrowerDetails(borrowerId), deliveryMethod: "Blend", deliveryDate });
    }
  }
  return { ...record, deliveredAt, borrowerDetails: updated };
}

export function beginDisclosureEdit(loanId: string, id: number): DisclosureEditSnapshot {
  const history = loadClosingDisclosureHistory(loanId);
  const record = history.records.find((row) => row.id === id);
  if (!record) throw new Error("This disclosure was reset or removed. Close the editor and reopen the disclosure.");
  return { loanId, id, generatedAt: record.generatedAt, resetToken: history.resetToken, baseline: readBorrowerDetails(record) };
}

/** Three-way field merge: preserve unrelated edits, reject conflicting edits explicitly. */
export async function saveDisclosureBorrowers(
  loanId: string, snapshot: DisclosureEditSnapshot, draft: BorrowerDisclosureDetails[],
) {
  if (snapshot.loanId !== loanId) throw new Error("This editor belongs to a different loan. Close it and reopen the disclosure.");
  readBorrowerDetails({ id: snapshot.id, generatedAt: snapshot.generatedAt, deliveredAt: null, borrowerDetails: draft });
  try {
    await updateClosingDisclosureHistory(loanId, (history) => {
      const record = history.records.find((row) => row.id === snapshot.id);
      if (history.resetToken !== snapshot.resetToken || !record || record.generatedAt !== snapshot.generatedAt) {
        throw new Error("This disclosure was reset or removed. Close the editor and reopen the disclosure.");
      }
      const current = readBorrowerDetails(record);
      // Retain unmatched historical entries when saving the current borrower roster.
      const merged = current.map((item) => ({ ...item }));
      for (const edited of draft) {
        const base = snapshot.baseline.find((item) => item.borrowerId === edited.borrowerId) ?? blankBorrowerDetails(edited.borrowerId);
        const latest = current.find((item) => item.borrowerId === edited.borrowerId) ?? blankBorrowerDetails(edited.borrowerId);
        const result = { ...latest };
        for (const field of fields) {
          if (edited[field] === base[field]) continue;
          if (latest[field] !== base[field] && latest[field] !== edited[field]) {
            throw new Error("These borrower details changed in another window. Your draft has not been saved. Close and reopen the editor to review the latest details.");
          }
          // All draft values were validated above.
          Object.assign(result, { [field]: edited[field] });
        }
        const index = merged.findIndex((item) => item.borrowerId === edited.borrowerId);
        if (index < 0) merged.push(result);
        else merged[index] = result;
      }
      return { ...history, records: history.records.map((row) =>
        row.id === snapshot.id ? { ...row, borrowerDetails: merged } : row) };
    });
  } catch (error) {
    if (error instanceof Error && /reset or removed|changed in another window|could not be read/.test(error.message)) throw error;
    throw new Error("Borrower details could not be saved. Your draft is still open. Enable browser storage and try again.");
  }
}

export function formatCalendarDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

export function summarizeBorrowerField(
  details: BorrowerDisclosureDetails[], field: "deliveryMethod" | "deliveryDate" | "viewedDate",
) {
  const values = details.map((item) => item[field]);
  const recorded = values.filter(Boolean);
  if (!recorded.length) return "";
  const partial = recorded.length !== values.length;
  if (new Set(recorded).size > 1) {
    const summary = field === "deliveryMethod" ? "Multiple methods" : "Multiple dates";
    return partial ? `${summary} · partially recorded` : summary;
  }
  if (partial) return "Partially recorded";
  return field === "deliveryMethod" ? recorded[0] : formatCalendarDate(recorded[0]);
}
