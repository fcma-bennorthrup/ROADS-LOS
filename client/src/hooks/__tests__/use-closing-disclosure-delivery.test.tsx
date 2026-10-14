import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { useClosingDisclosures } from "../use-closing-disclosures";
import {
  beginDisclosureEdit, blankBorrowerDetails, saveDisclosureBorrowers,
  type DisclosureBorrower,
} from "@/lib/closing-disclosure-borrowers";
import { closingDisclosureStorageKey, loadClosingDisclosures, type ClosingDisclosureRecord } from "@/lib/closing-disclosure-history";

const borrowers: DisclosureBorrower[] = [
  { id: "a", name: "Borrower A", isPrimary: true },
  { id: "b", name: "Borrower B", isPrimary: false },
  { id: "c", name: "Borrower C", isPrimary: false },
];
const record: ClosingDisclosureRecord = { id: 1, generatedAt: "2026-10-05T12:00:00.000Z", deliveredAt: null };
function seed(records: ClosingDisclosureRecord[] = [record], loanId = "delivery") {
  localStorage.setItem(closingDisclosureStorageKey(loanId), JSON.stringify(records));
}
function consumer(loanId = "delivery") {
  const { hook } = memoryLocation({ path: `/loans/${loanId}` });
  return renderHook(() => useClosingDisclosures(loanId), {
    wrapper: ({ children }) => <Router hook={hook}><ChecklistProvider>{children}</ChecklistProvider></Router>,
  });
}
function queuedLocks() {
  const pending: Array<() => void> = [];
  const request = vi.fn((_key: string, write: () => void) => new Promise<void>((resolve, reject) => {
    pending.push(() => { try { write(); resolve(); } catch (error) { reject(error); } });
  }));
  Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
  return { request, commit: () => pending.shift()!() };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 14, 14, 15));
  seed();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
});

describe("Closing Disclosure borrower delivery", () => {
  it("sets Blend for every borrower without defaulting viewing or rewriting other records/loans", () => {
    const saved: ClosingDisclosureRecord = {
      ...record, id: 2, borrowerDetails: [
        { ...blankBorrowerDetails("a"), deliveryMethod: "Mail", deliveryDate: "2026-10-01", cdViewed: "Yes", viewedDate: "2026-10-06" },
        { ...blankBorrowerDetails("b"), deliveryMethod: "Hand Delivery", cdViewed: "No", viewedDate: "2026-10-07" },
        blankBorrowerDetails("c"),
        { ...blankBorrowerDetails("retired"), deliveryMethod: "Mail", deliveryDate: "2026-09-01" },
      ],
    };
    seed([saved, record]);
    seed([record], "other");
    const a = consumer();
    const b = consumer();
    const write = vi.spyOn(Storage.prototype, "setItem");
    act(() => a.result.current.deliver(2, borrowers));
    const delivered = loadClosingDisclosures("delivery")[0];
    expect(delivered.generatedAt).toBe(saved.generatedAt);
    expect(delivered.deliveredAt).toBe(new Date().toISOString());
    expect(write.mock.calls.filter(([key]) => key === closingDisclosureStorageKey("delivery"))).toHaveLength(1);
    for (const borrower of borrowers) {
      const before = saved.borrowerDetails!.find((item) => item.borrowerId === borrower.id)!;
      expect(delivered.borrowerDetails!.find((item) => item.borrowerId === borrower.id)).toEqual({
        ...before, deliveryMethod: "Blend", deliveryDate: "2026-10-14",
      });
    }
    expect(delivered.borrowerDetails![3]).toEqual(saved.borrowerDetails![3]);
    expect(loadClosingDisclosures("delivery")[1]).toEqual(record);
    expect(loadClosingDisclosures("other")).toEqual([record]);
    expect(b.result.current.records).toEqual(a.result.current.records);
  });

  it("creates blank viewing details on legacy records only when delivered", () => {
    const hook = consumer();
    expect(hook.result.current.records[0]).toEqual(record);
    act(() => hook.result.current.deliver(1, [borrowers[0]]));
    expect(loadClosingDisclosures("delivery")[0].borrowerDetails).toEqual([
      { ...blankBorrowerDetails("a"), deliveryMethod: "Blend", deliveryDate: "2026-10-14" },
    ]);
  });

  it("keeps zero-borrower delivery compatible and creates no fake metadata", () => {
    const hook = consumer();
    act(() => hook.result.current.deliver(1, []));
    expect(loadClosingDisclosures("delivery")[0]).toEqual({ ...record, deliveredAt: new Date().toISOString() });
  });

  it("captures the local click date rather than the UTC day even if commit crosses midnight", async () => {
    vi.stubEnv("TZ", "America/Chicago");
    vi.setSystemTime(new Date("2026-10-15T04:58:00.000Z")); // October 14, 11:58pm locally.
    const hook = consumer();
    const locks = queuedLocks();
    const capturedBorrowers = borrowers.map((item) => ({ ...item }));
    act(() => hook.result.current.deliver(1, capturedBorrowers));
    capturedBorrowers[0].id = "changed-after-click";
    vi.setSystemTime(new Date("2026-10-15T05:05:00.000Z"));
    expect(loadClosingDisclosures("delivery")[0].deliveredAt).toBeNull();
    await act(async () => { locks.commit(); });
    const delivered = loadClosingDisclosures("delivery")[0];
    expect(delivered.deliveredAt).toBe("2026-10-15T04:58:00.000Z");
    expect(delivered.borrowerDetails!.map((item) => item.deliveryDate)).toEqual(Array(3).fill("2026-10-14"));
    expect(delivered.borrowerDetails!.map((item) => item.borrowerId)).toEqual(["a", "b", "c"]);
  });

  it("retains the local next-day date in a positive UTC offset", () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    vi.setSystemTime(new Date("2026-10-14T16:05:00.000Z")); // October 15, 1:05am locally.
    const hook = consumer();
    act(() => hook.result.current.deliver(1, borrowers));
    const delivered = loadClosingDisclosures("delivery")[0];
    expect(delivered.deliveredAt).toBe("2026-10-14T16:05:00.000Z");
    expect(delivered.borrowerDetails![0].deliveryDate).toBe("2026-10-15");
  });

  it("keeps the first delivery timestamp/date across queued duplicates and later attempts", async () => {
    const hook = consumer();
    const locks = queuedLocks();
    const clickedAt = new Date().toISOString();
    act(() => hook.result.current.deliver(1, borrowers));
    vi.setSystemTime(new Date(2026, 9, 15, 10));
    act(() => hook.result.current.deliver(1, borrowers));
    await act(async () => { locks.commit(); locks.commit(); });
    const saved = loadClosingDisclosures("delivery")[0];
    expect(saved.deliveredAt).toBe(clickedAt);
    expect(saved.borrowerDetails).toHaveLength(3);
    expect(saved.borrowerDetails![0].deliveryDate).toBe("2026-10-14");
    act(() => hook.result.current.deliver(1, borrowers));
    expect(locks.request).toHaveBeenCalledTimes(2);
    expect(loadClosingDisclosures("delivery")[0]).toEqual(saved);
  });

  it("reads the latest viewing data even before a cross-tab notification", async () => {
    const hook = consumer();
    const locks = queuedLocks();
    act(() => hook.result.current.deliver(1, borrowers));
    const remote = { ...record, borrowerDetails: [
      { ...blankBorrowerDetails("a"), cdViewed: "Yes" as const, viewedDate: "2026-10-13" },
      { ...blankBorrowerDetails("b"), cdViewed: "No" as const },
    ] };
    seed([remote]); // Deliberately no storage notification to this stale consumer.
    await act(async () => { locks.commit(); });
    const saved = loadClosingDisclosures("delivery")[0];
    expect(saved.borrowerDetails![0]).toEqual({ ...remote.borrowerDetails[0], deliveryMethod: "Blend", deliveryDate: "2026-10-14" });
    expect(saved.borrowerDetails![1].cdViewed).toBe("No");
    expect(saved.borrowerDetails![2].cdViewed).toBe("");
  });

  it("reports synchronous write failure without publishing any part of delivery", () => {
    const hook = consumer();
    const before = localStorage.getItem(closingDisclosureStorageKey("delivery"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    act(() => hook.result.current.deliver(1, borrowers));
    expect(hook.result.current.error).toContain("could not be saved");
    expect(hook.result.current.records[0]).toEqual(record);
    expect(localStorage.getItem(closingDisclosureStorageKey("delivery"))).toBe(before);
  });

  it("reports asynchronous failure without recording a delivery timestamp or borrower changes", async () => {
    const hook = consumer();
    const locks = queuedLocks();
    act(() => hook.result.current.deliver(1, borrowers));
    const before = localStorage.getItem(closingDisclosureStorageKey("delivery"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    await act(async () => { locks.commit(); });
    expect(hook.result.current.error).toContain("could not be saved");
    expect(hook.result.current.records[0]).toEqual(record);
    expect(localStorage.getItem(closingDisclosureStorageKey("delivery"))).toBe(before);
  });

  it("fails explicitly on malformed viewing metadata instead of overwriting or partially delivering", () => {
    seed([{ ...record, borrowerDetails: [{ ...blankBorrowerDetails("a"), viewedDate: "invalid" }] }]);
    const hook = consumer();
    const before = localStorage.getItem(closingDisclosureStorageKey("delivery"));
    act(() => hook.result.current.deliver(1, borrowers));
    expect(hook.result.current.error).toContain("could not be saved");
    expect(hook.result.current.records[0].deliveredAt).toBeNull();
    expect(localStorage.getItem(closingDisclosureStorageKey("delivery"))).toBe(before);
  });

  it("cannot deliver a reset record with reused numbering and identical generation time", async () => {
    const hook = consumer();
    const locks = queuedLocks();
    act(() => hook.result.current.deliver(1, borrowers));
    localStorage.setItem(closingDisclosureStorageKey("delivery"), JSON.stringify({
      records: [record], resetToken: "remote-reset", resetScope: "disclosure",
    }));
    await act(async () => { locks.commit(); });
    expect(loadClosingDisclosures("delivery")).toEqual([record]);
  });

  it("cannot deliver a replaced record even without a reset-token change", async () => {
    const hook = consumer();
    const locks = queuedLocks();
    act(() => hook.result.current.deliver(1, borrowers));
    const replaced = { ...record, generatedAt: "2026-10-14T12:00:00.000Z" };
    seed([replaced]);
    await act(async () => { locks.commit(); });
    expect(loadClosingDisclosures("delivery")).toEqual([replaced]);
  });

  it("merges a stale viewing-only edit and rejects a stale conflicting delivery edit", async () => {
    const hook = consumer();
    const viewingSnapshot = beginDisclosureEdit("delivery", 1);
    const deliverySnapshot = beginDisclosureEdit("delivery", 1);
    act(() => hook.result.current.deliver(1, borrowers));
    const deliveredAt = loadClosingDisclosures("delivery")[0].deliveredAt;
    await act(async () => {
      await saveDisclosureBorrowers("delivery", viewingSnapshot, [
        { ...blankBorrowerDetails("a"), cdViewed: "Yes", viewedDate: "2026-10-13" },
      ]);
    });
    const saved = loadClosingDisclosures("delivery")[0];
    expect(saved.borrowerDetails![0]).toEqual({
      ...blankBorrowerDetails("a"), deliveryMethod: "Blend", deliveryDate: "2026-10-14", cdViewed: "Yes", viewedDate: "2026-10-13",
    });
    expect(saved.deliveredAt).toBe(deliveredAt);
    await expect(saveDisclosureBorrowers("delivery", deliverySnapshot, [
      { ...blankBorrowerDetails("a"), deliveryMethod: "Mail" },
    ])).rejects.toThrow("changed in another window");
    expect(loadClosingDisclosures("delivery")[0]).toEqual(saved);
  });
});
