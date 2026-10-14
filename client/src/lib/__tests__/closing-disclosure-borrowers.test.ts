import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginDisclosureEdit, blankBorrowerDetails, detailsForBorrowers,
  formatCalendarDate, isCalendarDate, readBorrowerDetails, saveDisclosureBorrowers,
  summarizeBorrowerField,
  summarizeBorrowerViewing, borrowerViewingBadge, hasSharedDelivery,
} from "../closing-disclosure-borrowers";
import { closingDisclosureStorageKey, loadClosingDisclosures, resetClosingDisclosureHistory } from "../closing-disclosure-history";

const record = { id: 1, generatedAt: "2026-10-05T10:00:00.000Z", deliveredAt: null };
const a = { id: "a", name: "Borrower A", isPrimary: true };
const b = { id: "b", name: "Borrower B", isPrimary: false };
function seed(rows = [record], loanId = "test") {
  localStorage.setItem(closingDisclosureStorageKey(loanId), JSON.stringify(rows));
}
beforeEach(() => { seed(); });

describe("borrower disclosure metadata", () => {
  it("derives non-ROR completion from any explicit Yes without rewriting individual records", () => {
    const details = [
      { ...blankBorrowerDetails("a"), cdViewed: "No" as const },
      { ...blankBorrowerDetails("b"), cdViewed: "Yes" as const },
      blankBorrowerDetails("c"),
    ];
    const before = JSON.stringify(details);
    expect(summarizeBorrowerViewing(details)).toMatchObject({
      confirmed: 1, total: 3, requirementMet: true, summary: "1 of 3 viewed · Requirement met",
    });
    expect(borrowerViewingBadge(details[0], true)).toEqual({ label: "Not viewed", tone: "neutral" });
    expect(borrowerViewingBadge(details[1], true)).toEqual({ label: "Viewed", tone: "success" });
    expect(borrowerViewingBadge(details[2], true)).toEqual({ label: "Not recorded", tone: "neutral" });
    expect(JSON.stringify(details)).toBe(before);
    expect(summarizeBorrowerViewing(details.map((item) => ({ ...item, cdViewed: "" })))).toMatchObject({
      requirementMet: false, allUnrecorded: true, summary: "Not recorded",
    });
    expect(summarizeBorrowerViewing([details[0], details[2]]).summary).toBe("0 of 2 viewed · Viewing needed");
    expect(borrowerViewingBadge(details[0], false)).toEqual({ label: "Viewing Needed", tone: "pending" });
    expect(summarizeBorrowerViewing([])).toMatchObject({ requirementMet: false, summary: "No borrowers" });
  });

  it("initializes linking only for multiple borrowers with matching nonblank delivery values", () => {
    const first = { ...blankBorrowerDetails("a"), deliveryMethod: "Blend" as const, deliveryDate: "2026-10-14" };
    const second = { ...first, borrowerId: "b", cdViewed: "No" as const };
    expect(hasSharedDelivery([first, second], "a")).toBe(true);
    expect(hasSharedDelivery([first], "a")).toBe(false);
    expect(hasSharedDelivery([], "a")).toBe(false);
    expect(hasSharedDelivery([first, second], "missing")).toBe(false);
    expect(hasSharedDelivery([blankBorrowerDetails("a"), blankBorrowerDetails("b")], "a")).toBe(false);
    expect(hasSharedDelivery([first, { ...second, deliveryMethod: "Mail" }], "a")).toBe(false);
    expect(hasSharedDelivery([first, { ...second, deliveryDate: "" }], "a")).toBe(false);
  });

  it("loads legacy disclosures as blank real borrower sections without writing data", () => {
    const before = localStorage.getItem(closingDisclosureStorageKey("test"));
    expect(detailsForBorrowers(record, [a, b])).toEqual([blankBorrowerDetails("a"), blankBorrowerDetails("b")]);
    expect(detailsForBorrowers(record, [])).toEqual([]);
    expect(localStorage.getItem(closingDisclosureStorageKey("test"))).toBe(before);
  });

  it("saves all fields per borrower, independently of generation and delivery timestamps", async () => {
    seed([{ ...record, deliveredAt: "2026-10-05T11:00:00.000Z" }]);
    const snapshot = beginDisclosureEdit("test", 1);
    const draft = [
      { ...blankBorrowerDetails("a"), deliveryMethod: "Blend" as const, deliveryDate: "2026-10-05", cdViewed: "Yes" as const, viewedDate: "2026-10-06" },
      { ...blankBorrowerDetails("b"), deliveryMethod: "Hand Delivery" as const, cdViewed: "No" as const },
    ];
    await saveDisclosureBorrowers("test", snapshot, draft);
    const saved = loadClosingDisclosures("test")[0];
    expect(saved.generatedAt).toBe(record.generatedAt);
    expect(saved.deliveredAt).toBe("2026-10-05T11:00:00.000Z");
    expect(readBorrowerDetails(saved)).toEqual(draft);
    const reopened = beginDisclosureEdit("test", 1);
    await saveDisclosureBorrowers("test", reopened, draft.map((item) => blankBorrowerDetails(item.borrowerId)));
    expect(readBorrowerDetails(loadClosingDisclosures("test")[0])).toEqual(draft.map((item) => blankBorrowerDetails(item.borrowerId)));
  });

  it("merges edits to different borrowers and different fields against the latest storage", async () => {
    const first = beginDisclosureEdit("test", 1);
    const second = beginDisclosureEdit("test", 1);
    await saveDisclosureBorrowers("test", first, [{ ...blankBorrowerDetails("a"), deliveryMethod: "Mail" }]);
    await saveDisclosureBorrowers("test", second, [
      { ...blankBorrowerDetails("a"), cdViewed: "Yes" },
      { ...blankBorrowerDetails("b"), deliveryMethod: "Blend" },
    ]);
    expect(readBorrowerDetails(loadClosingDisclosures("test")[0])).toEqual([
      { ...blankBorrowerDetails("a"), deliveryMethod: "Mail", cdViewed: "Yes" },
      { ...blankBorrowerDetails("b"), deliveryMethod: "Blend" },
    ]);
  });

  it("rejects conflicting same-field edits without losing saved changes", async () => {
    const first = beginDisclosureEdit("test", 1);
    const second = beginDisclosureEdit("test", 1);
    await saveDisclosureBorrowers("test", first, [{ ...blankBorrowerDetails("a"), deliveryMethod: "Mail" }]);
    const before = localStorage.getItem(closingDisclosureStorageKey("test"));
    await expect(saveDisclosureBorrowers("test", second, [{ ...blankBorrowerDetails("a"), deliveryMethod: "Blend" }]))
      .rejects.toThrow("changed in another window");
    expect(localStorage.getItem(closingDisclosureStorageKey("test"))).toBe(before);
  });

  it("keeps another disclosure and loan unchanged", async () => {
    seed([{ ...record, id: 2 }, record]);
    seed([record], "other");
    const snapshot = beginDisclosureEdit("test", 1);
    await expect(saveDisclosureBorrowers("other", snapshot, [blankBorrowerDetails("a")])).rejects.toThrow("different loan");
    await saveDisclosureBorrowers("test", snapshot, [{ ...blankBorrowerDetails("a"), cdViewed: "No" }]);
    expect(loadClosingDisclosures("test")[0]).toEqual({ ...record, id: 2 });
    expect(loadClosingDisclosures("other")).toEqual([record]);
  });

  it("blocks stale edits even when a reset reuses both ID and generation timestamp", async () => {
    const snapshot = beginDisclosureEdit("test", 1);
    await resetClosingDisclosureHistory("test", true);
    const reset = JSON.parse(localStorage.getItem(closingDisclosureStorageKey("test"))!);
    localStorage.setItem(closingDisclosureStorageKey("test"), JSON.stringify({ ...reset, records: [record] }));
    await expect(saveDisclosureBorrowers("test", snapshot, [blankBorrowerDetails("a")])).rejects.toThrow("reset or removed");
    expect(loadClosingDisclosures("test")).toEqual([record]);
  });

  it("blocks an editor whose disclosure was removed without a notification", async () => {
    const snapshot = beginDisclosureEdit("test", 1);
    localStorage.removeItem(closingDisclosureStorageKey("test"));
    await expect(saveDisclosureBorrowers("test", snapshot, [blankBorrowerDetails("a")])).rejects.toThrow("reset or removed");
    expect(loadClosingDisclosures("test")).toEqual([]);
  });

  it("rechecks reset identity inside a pending browser lock", async () => {
    let write!: () => void;
    let release!: () => void;
    const request = vi.fn((_key: string, callback: () => void) => {
      write = callback;
      return new Promise<void>((resolve, reject) => { release = () => { try { write(); resolve(); } catch (error) { reject(error); } }; });
    });
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    try {
      const snapshot = beginDisclosureEdit("test", 1);
      const pending = saveDisclosureBorrowers("test", snapshot, [blankBorrowerDetails("a")]);
      localStorage.setItem(closingDisclosureStorageKey("test"), JSON.stringify({ records: [record], resetToken: "remote-reset" }));
      release();
      await expect(pending).rejects.toThrow("reset or removed");
      expect(loadClosingDisclosures("test")).toEqual([record]);
    } finally {
      Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    }
  });

  it("reports failed writes and retains existing metadata", async () => {
    const snapshot = beginDisclosureEdit("test", 1);
    const before = localStorage.getItem(closingDisclosureStorageKey("test"));
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    try {
      await expect(saveDisclosureBorrowers("test", snapshot, [blankBorrowerDetails("a")])).rejects.toThrow("draft is still open");
      expect(localStorage.getItem(closingDisclosureStorageKey("test"))).toBe(before);
    } finally { spy.mockRestore(); }
  });

  it("isolates malformed metadata from the toolbar history reader", () => {
    const malformed = { ...record, borrowerDetails: { invalid: true } };
    localStorage.setItem(closingDisclosureStorageKey("test"), JSON.stringify([malformed]));
    expect(loadClosingDisclosures("test")).toHaveLength(1);
    expect(() => readBorrowerDetails(loadClosingDisclosures("test")[0])).toThrow("could not be read");
  });

  it("validates only date syntax, not lending rules, and preserves calendar days", async () => {
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("")).toBe(true);
    expect(formatCalendarDate("2026-10-05")).toBe("10/05/2026");
    await saveDisclosureBorrowers("test", beginDisclosureEdit("test", 1), [
      { ...blankBorrowerDetails("a"), cdViewed: "Yes", deliveryDate: "2026-10-07", viewedDate: "2026-10-05" },
    ]);
    expect(readBorrowerDetails(loadClosingDisclosures("test")[0])[0].viewedDate).toBe("2026-10-05");
  });

  it("summarizes shared, mixed, partial and unrecorded values", () => {
    const first = { ...blankBorrowerDetails("a"), deliveryMethod: "Mail" as const, deliveryDate: "2026-10-05" };
    const second = { ...first, borrowerId: "b" };
    expect(summarizeBorrowerField([first, second], "deliveryMethod")).toBe("Mail");
    expect(summarizeBorrowerField([first, second], "deliveryDate")).toBe("10/05/2026");
    expect(summarizeBorrowerField([first, { ...second, deliveryMethod: "Blend" }], "deliveryMethod")).toBe("Multiple methods");
    expect(summarizeBorrowerField([first, { ...second, deliveryDate: "2026-10-06" }], "deliveryDate")).toBe("Multiple dates");
    expect(summarizeBorrowerField([first, blankBorrowerDetails("b")], "deliveryDate")).toBe("Partially recorded");
    expect(summarizeBorrowerField([first, { ...second, deliveryMethod: "Blend" }, blankBorrowerDetails("c")], "deliveryMethod"))
      .toBe("Multiple methods · partially recorded");
    expect(summarizeBorrowerField([first, { ...second, deliveryDate: "2026-10-06" }, blankBorrowerDetails("c")], "deliveryDate"))
      .toBe("Multiple dates · partially recorded");
    expect(summarizeBorrowerField([], "viewedDate")).toBe("");
  });
});
