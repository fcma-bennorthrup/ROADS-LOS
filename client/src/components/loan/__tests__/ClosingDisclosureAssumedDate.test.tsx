import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClosingDocumentsContent } from "../DocumentsContent";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { blankBorrowerDetails } from "@/lib/closing-disclosure-borrowers";
import { closingDisclosureStorageKey, loadClosingDisclosures, type ClosingDisclosureRecord } from "@/lib/closing-disclosure-history";

const borrowers = [
  { id: "a", name: "Borrower A", isPrimary: true },
  { id: "b", name: "Borrower B", isPrimary: false },
];
const record: ClosingDisclosureRecord = { id: 1, generatedAt: "2026-10-01T12:00:00.000Z", deliveredAt: null };
const details = borrowers.map((borrower, index) => ({
  ...blankBorrowerDetails(borrower.id), deliveryMethod: "Mail" as const,
  deliveryDate: "2026-10-14", cdViewed: index === 0 ? "Yes" as const : "No" as const,
  viewedDate: index === 0 ? "2026-10-15" : "",
}));
function seed(rows: ClosingDisclosureRecord[] = [record]) {
  localStorage.setItem(closingDisclosureStorageKey("assumed"), JSON.stringify(rows));
}
function mount(roster = borrowers) {
  return render(<ChecklistProvider><ClosingDocumentsContent loanId="assumed" borrowers={roster} /></ChecklistProvider>);
}
const cell = (id = 1) => screen.getByTestId(`text-assumed-delivery-date-${id}`);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 14, 14, 15)); seed(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("Assumed Delivery Date table column", () => {
  it("populates the exact example after successful delivery without adding derived storage", () => {
    const newest = { ...record, id: 2, generatedAt: "2026-10-05T12:00:00.000Z", borrowerDetails: details };
    seed([newest, record]);
    mount();
    expect(cell()).toBeEmptyDOMElement();
    expect(cell(2)).toBeEmptyDOMElement();
    const header = screen.getAllByRole("columnheader").map((node) => node.textContent);
    expect(header.slice(2, 5)).toEqual(["Delivery Date", "Assumed Delivery Date", "Delivery Method"]);
    expect(within(screen.getByTestId("row-closing-disclosure-1")).getAllByRole("cell")).toHaveLength(7);
    const writes = vi.spyOn(Storage.prototype, "setItem");
    fireEvent.click(screen.getByTestId("button-deliver-closing-disclosure"));
    expect(cell(2)).toHaveTextContent("10/17/2026");
    expect(cell()).toBeEmptyDOMElement();
    expect(writes.mock.calls.filter(([key]) => key === closingDisclosureStorageKey("assumed"))).toHaveLength(1);
    const saved = loadClosingDisclosures("assumed");
    expect(saved[0].borrowerDetails!.map((item) => item.cdViewed)).toEqual(["Yes", "No"]);
    expect(saved[0].generatedAt).toBe(newest.generatedAt);
    expect(saved[0]).not.toHaveProperty("assumedDeliveryDate");
    expect(saved[0].borrowerDetails![0]).not.toHaveProperty("assumedDeliveryDate");
    expect(saved[1]).toEqual(record);
  });

  it("waits for an atomic queued delivery commit before displaying its assumed date", async () => {
    mount();
    let commit!: () => void;
    Object.defineProperty(navigator, "locks", { configurable: true, value: {
      request: (_key: string, write: () => void) => new Promise<void>((resolve) => {
        commit = () => { write(); resolve(); };
      }),
    } });
    try {
      fireEvent.click(screen.getByTestId("button-deliver-closing-disclosure"));
      expect(cell()).toBeEmptyDOMElement();
      expect(loadClosingDisclosures("assumed")[0].deliveredAt).toBeNull();
      await act(async () => { commit(); });
      expect(cell()).toHaveTextContent("10/17/2026");
    } finally {
      Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    }
  });

  it("stays blank when marking delivered fails rather than displaying optimistic dates", () => {
    mount();
    const before = localStorage.getItem(closingDisclosureStorageKey("assumed"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    fireEvent.click(screen.getByTestId("button-deliver-closing-disclosure"));
    expect(screen.getByRole("alert")).toHaveTextContent("could not be saved");
    expect(cell()).toBeEmptyDOMElement();
    expect(localStorage.getItem(closingDisclosureStorageKey("assumed"))).toBe(before);
  });

  it("updates from successful linked manual corrections and survives remount without changing viewing or original timestamps", async () => {
    const saved = { ...record, deliveredAt: "2026-10-14T12:00:00.000Z", borrowerDetails: details };
    seed([saved]); const view = mount();
    expect(cell()).toHaveTextContent("10/17/2026");
    fireEvent.click(screen.getByTestId("button-edit-closing-disclosure-1"));
    fireEvent.change(screen.getByTestId("input-delivery-date-a"), { target: { value: "2026-10-20" } });
    expect(cell()).toHaveTextContent("10/17/2026"); // Draft only until Save commits.
    await act(async () => { fireEvent.click(screen.getByTestId("button-save-borrower-edit-1")); });
    expect(cell()).toHaveTextContent("10/23/2026");
    const corrected = loadClosingDisclosures("assumed")[0];
    expect(corrected.deliveredAt).toBe(saved.deliveredAt);
    expect(corrected.generatedAt).toBe(saved.generatedAt);
    expect(corrected.borrowerDetails!.map(({ cdViewed, viewedDate }) => ({ cdViewed, viewedDate })))
      .toEqual(details.map(({ cdViewed, viewedDate }) => ({ cdViewed, viewedDate })));
    view.unmount(); mount();
    expect(cell()).toHaveTextContent("10/23/2026");
  });

  it("reflects native cross-tab corrections and reset, keeping summaries instead of inventing a single date", () => {
    seed([{ ...record, deliveredAt: "2026-10-14T12:00:00.000Z", borrowerDetails: details }]);
    mount();
    act(() => {
      seed([{ ...record, deliveredAt: "2026-10-14T12:00:00.000Z", borrowerDetails: [
        details[0], { ...details[1], deliveryDate: "2026-10-15" },
      ] }]);
      window.dispatchEvent(new StorageEvent("storage", { key: closingDisclosureStorageKey("assumed"), storageArea: localStorage }));
    });
    expect(cell()).toHaveTextContent("Multiple dates");
    act(() => {
      localStorage.setItem(closingDisclosureStorageKey("assumed"), JSON.stringify({ records: [], resetToken: "reset", resetScope: "disclosure" }));
      window.dispatchEvent(new StorageEvent("storage", { key: closingDisclosureStorageKey("assumed"), storageArea: localStorage }));
    });
    expect(screen.queryByTestId("text-assumed-delivery-date-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("text-closing-disclosure-empty")).toHaveAttribute("colspan", "7");
  });

  it("displays legacy local-day fallback without writing or fabricating borrower records", () => {
    vi.stubEnv("TZ", "America/Chicago");
    seed([{ ...record, deliveredAt: "2026-10-15T04:58:00.000Z" }]);
    const before = localStorage.getItem(closingDisclosureStorageKey("assumed"));
    const view = mount([]);
    expect(cell()).toHaveTextContent("10/17/2026");
    expect(localStorage.getItem(closingDisclosureStorageKey("assumed"))).toBe(before);
    expect(loadClosingDisclosures("assumed")[0].borrowerDetails).toBeUndefined();
    view.unmount(); mount();
    expect(cell()).toHaveTextContent("10/17/2026");
    expect(localStorage.getItem(closingDisclosureStorageKey("assumed"))).toBe(before);
  });

  it("does not calculate a plausible date when stored borrower metadata cannot be read", () => {
    seed([{ ...record, deliveredAt: "2026-10-14T12:00:00.000Z", borrowerDetails: [
      { ...details[0], deliveryDate: "2026-02-30" },
    ] }]);
    const before = localStorage.getItem(closingDisclosureStorageKey("assumed"));
    mount();
    expect(cell()).toHaveTextContent("Borrower details unavailable");
    expect(localStorage.getItem(closingDisclosureStorageKey("assumed"))).toBe(before);
  });
});
