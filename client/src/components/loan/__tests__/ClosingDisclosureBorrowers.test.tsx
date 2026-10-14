import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClosingDocumentsContent } from "../DocumentsContent";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { closingDisclosureStorageKey, loadClosingDisclosures, resetClosingDisclosureHistory, updateClosingDisclosureHistory } from "@/lib/closing-disclosure-history";
import { blankBorrowerDetails } from "@/lib/closing-disclosure-borrowers";
import { MemStorage } from "../../../../../server/storage";

const borrowers = [
  { id: "a", name: "Borrower A", isPrimary: true },
  { id: "b", name: "Borrower B", isPrimary: false },
  { id: "c", name: "Borrower C", isPrimary: false },
];
const record = { id: 1, generatedAt: "2026-10-05T12:00:00.000Z", deliveredAt: null };
function setup(list = borrowers) {
  localStorage.setItem(closingDisclosureStorageKey("test"), JSON.stringify([record]));
  return render(<ChecklistProvider><ClosingDocumentsContent loanId="test" borrowers={list} /></ChecklistProvider>);
}
const edit = () => fireEvent.click(screen.getByTestId("button-edit-closing-disclosure-1"));
function change(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}
async function save() {
  await act(async () => fireEvent.click(screen.getByTestId("button-save-borrower-edit-1")));
}

describe("borrower disclosure editing", () => {
  it("reattaches saved delivery and viewing fields after a demo-server restart without touching another loan", async () => {
    const initialBorrowers = await new MemStorage().getBorrowersByLoanId("1");
    localStorage.setItem(closingDisclosureStorageKey("1"), JSON.stringify([record]));
    // Even identical borrower IDs and disclosure IDs cannot cross the loan storage boundary.
    const otherHistory = JSON.stringify([{ ...record, borrowerDetails: [
      { ...blankBorrowerDetails(initialBorrowers[0].id), deliveryMethod: "Hand Delivery", cdViewed: "No" },
    ] }]);
    localStorage.setItem(closingDisclosureStorageKey("other"), otherHistory);
    const view = render(<ChecklistProvider><ClosingDocumentsContent loanId="1" borrowers={initialBorrowers} /></ChecklistProvider>);
    edit();
    initialBorrowers.forEach((borrower, index) => {
      change(`select-delivery-method-${borrower.id}`, index === 0 ? "Mail" : "Blend");
      change(`input-delivery-date-${borrower.id}`, "2026-10-05");
      change(`select-cd-viewed-${borrower.id}`, index === 0 ? "Yes" : "No");
      change(`input-viewed-date-${borrower.id}`, index === 0 ? "2026-10-06" : "");
    });
    await save();
    const saved = localStorage.getItem(closingDisclosureStorageKey("1"));
    view.unmount();
    const restartedBorrowers = await new MemStorage().getBorrowersByLoanId("1");
    render(<ChecklistProvider><ClosingDocumentsContent loanId="1" borrowers={restartedBorrowers} /></ChecklistProvider>);
    expect(screen.getByTestId("button-view-borrower-status-1")).toHaveTextContent("1 of 3 viewed");
    edit();
    restartedBorrowers.forEach((borrower, index) => {
      expect(screen.getByTestId(`select-delivery-method-${borrower.id}`)).toHaveValue(index === 0 ? "Mail" : "Blend");
      expect(screen.getByTestId(`input-delivery-date-${borrower.id}`)).toHaveValue("2026-10-05");
      expect(screen.getByTestId(`select-cd-viewed-${borrower.id}`)).toHaveValue(index === 0 ? "Yes" : "No");
      expect(screen.getByTestId(`input-viewed-date-${borrower.id}`)).toHaveValue(index === 0 ? "2026-10-06" : "");
    });
    expect(localStorage.getItem(closingDisclosureStorageKey("1"))).toBe(saved);
    expect(localStorage.getItem(closingDisclosureStorageKey("other"))).toBe(otherHistory);
  });

  it("warns about old unmatched IDs without guessing associations or deleting their history on save or delivery", async () => {
    const oldDetails = { ...blankBorrowerDetails("old-random-id"), deliveryMethod: "Mail" as const,
      deliveryDate: "2026-10-01", cdViewed: "Yes" as const, viewedDate: "2026-10-02" };
    const saved = JSON.stringify([{ ...record, borrowerDetails: [oldDetails] }]);
    localStorage.setItem(closingDisclosureStorageKey("test"), saved);
    render(<ChecklistProvider><ClosingDocumentsContent loanId="test" borrowers={borrowers} /></ChecklistProvider>);
    edit();
    expect(screen.getByTestId("notice-unmatched-borrowers-1")).toHaveTextContent("kept unchanged");
    expect(screen.getByTestId("select-delivery-method-a")).toHaveValue("");
    expect(screen.getByTestId("select-cd-viewed-a")).toHaveValue("");
    fireEvent.click(screen.getByTestId("button-cancel-borrower-edit-1"));
    expect(localStorage.getItem(closingDisclosureStorageKey("test"))).toBe(saved);
    edit();
    change("select-cd-viewed-a", "No");
    await save();
    expect(loadClosingDisclosures("test")[0].borrowerDetails).toContainEqual(oldDetails);
    fireEvent.click(screen.getByTestId("button-deliver-closing-disclosure"));
    expect(loadClosingDisclosures("test")[0].borrowerDetails).toContainEqual(oldDetails);
    edit();
    expect(screen.getByTestId("notice-unmatched-borrowers-1")).toBeVisible();
  });

  it("preserves existing viewed dates outside the simplified table without rewriting saved data", () => {
    const saved = JSON.stringify([{ ...record, borrowerDetails: [
      { ...blankBorrowerDetails("a"), cdViewed: "Yes", viewedDate: "2026-10-06" },
      blankBorrowerDetails("b"), blankBorrowerDetails("c"),
    ] }]);
    localStorage.setItem(closingDisclosureStorageKey("test"), saved);
    render(<ChecklistProvider><ClosingDocumentsContent loanId="test" borrowers={borrowers} /></ChecklistProvider>);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(7);
    expect(within(screen.getByTestId("row-closing-disclosure-1")).getAllByRole("cell")).toHaveLength(7);
    expect(within(table).queryByText("10/06/2026")).not.toBeInTheDocument();
    expect(screen.queryByTestId("text-viewed-date-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-view-borrower-status-1"));
    expect(screen.getByTestId("row-borrower-status-a")).toHaveTextContent("Viewed10/06/2026");
    fireEvent.keyDown(screen.getByTestId("popover-borrower-status-1"), { key: "Escape" });
    edit();
    expect(screen.getByTestId("input-viewed-date-a")).toHaveValue("2026-10-06");
    fireEvent.click(screen.getByTestId("button-cancel-borrower-edit-1"));
    expect(localStorage.getItem(closingDisclosureStorageKey("test"))).toBe(saved);
  });

  it("shows actual borrower names, blank values and the exact selectable methods", () => {
    setup(); edit();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Closing Disclosure Delivery");
    expect(screen.getByText("ROR does not apply. Only one borrower needs to view the CD."))
      .toHaveAttribute("id", screen.getByRole("dialog").getAttribute("aria-describedby"));
    for (const borrower of borrowers) {
      expect(screen.getByRole("heading", { name: borrower.name })).toBeVisible();
      expect(screen.getByTestId(`select-delivery-method-${borrower.id}`)).toHaveValue("");
      expect(screen.getByTestId(`input-delivery-date-${borrower.id}`)).toHaveValue("");
      expect(screen.getByTestId(`select-cd-viewed-${borrower.id}`)).toHaveValue("");
      expect(screen.getByTestId(`input-viewed-date-${borrower.id}`)).toHaveValue("");
    }
    expect(within(screen.getByTestId("select-delivery-method-a")).getAllByRole("option").map((item) => item.textContent))
      .toEqual(["Select a method", "Blend", "Mail", "Hand Delivery"]);
    expect(screen.getAllByText("Co-borrower")).toHaveLength(2);
  });

  it("copies only delivery fields, saves all borrowers, shows pending names and survives remount", async () => {
    const view = setup(); edit();
    change("select-delivery-method-a", "Blend");
    change("input-delivery-date-a", "2026-10-05");
    change("select-cd-viewed-a", "Yes");
    change("input-viewed-date-a", "2026-10-06");
    change("select-cd-viewed-b", "No");
    fireEvent.click(screen.getByTestId("checkbox-apply-delivery-a"));
    expect(screen.getByTestId("select-delivery-method-b")).toHaveValue("Blend");
    expect(screen.getByTestId("input-delivery-date-c")).toHaveValue("2026-10-05");
    expect(screen.getByTestId("select-cd-viewed-b")).toHaveValue("No");
    expect(screen.getByTestId("select-cd-viewed-c")).toHaveValue("");
    expect(screen.getByTestId("input-viewed-date-b")).toHaveValue("");
    await save();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("button-view-borrower-status-1")).toHaveTextContent("1 of 3 viewed · Requirement met");
    expect(screen.getByTestId("text-delivery-date-1")).toHaveTextContent("10/05/2026");
    expect(screen.queryByTestId("text-viewed-date-1")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Date CD Viewed" })).not.toBeInTheDocument();
    expect(loadClosingDisclosures("test")[0].deliveredAt).toBeNull();
    expect(screen.getByTestId("button-deliver-closing-disclosure")).toBeEnabled();
    fireEvent.click(screen.getByTestId("button-view-borrower-status-1"));
    expect(screen.getByTestId("row-borrower-status-a")).toHaveTextContent("Viewed10/06/2026");
    expect(screen.getByTestId("row-borrower-status-b")).toHaveTextContent("Not viewed");
    expect(screen.getByTestId("row-borrower-status-c")).toHaveTextContent("Not recorded");
    fireEvent.keyDown(screen.getByTestId("popover-borrower-status-1"), { key: "Escape" });
    view.unmount();
    render(<ChecklistProvider><ClosingDocumentsContent loanId="test" borrowers={borrowers} /></ChecklistProvider>);
    edit();
    expect(screen.getByTestId("input-delivery-date-c")).toHaveValue("2026-10-05");
    expect(screen.getByTestId("input-viewed-date-a")).toHaveValue("2026-10-06");
    expect(screen.getByTestId("select-cd-viewed-b")).toHaveValue("No");
  });

  it("cancel, Escape and X discard unsaved changes", () => {
    setup([borrowers[0]]);
    for (const dismiss of ["cancel", "escape", "close"]) {
      edit();
      change("select-delivery-method-a", "Mail");
      if (dismiss === "cancel") fireEvent.click(screen.getByTestId("button-cancel-borrower-edit-1"));
      else if (dismiss === "escape") fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      else fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
    edit();
    expect(screen.getByTestId("select-delivery-method-a")).toHaveValue("");
    expect(loadClosingDisclosures("test")[0].borrowerDetails).toBeUndefined();
  });

  it("allows one borrower to be Yes without a date and to clear status back to blank", async () => {
    setup([borrowers[0]]); edit();
    change("select-cd-viewed-a", "Yes");
    await save();
    expect(screen.getByTestId("button-view-borrower-status-1")).toHaveTextContent("1 of 1 viewed");
    expect(screen.getByTestId("button-view-borrower-status-1")).toHaveClass("is-success");
    edit(); change("select-cd-viewed-a", ""); await save();
    expect(screen.getByTestId("button-view-borrower-status-1")).toHaveTextContent("Not recorded");
    expect(screen.getByTestId("button-view-borrower-status-1")).toHaveClass("is-neutral");
  });

  it("offers no fake borrowers or successful zero counts", () => {
    setup([]);
    expect(screen.getByTestId("status-cd-viewed-1")).toHaveTextContent("No borrowers");
    edit();
    expect(screen.getByText("No borrowers to track")).toBeVisible();
    expect(screen.getByTestId("button-save-borrower-edit-1")).toBeDisabled();
  });

  it("retains failed drafts without disabling protected toolbar actions", async () => {
    setup(); edit(); change("select-delivery-method-a", "Mail");
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    try {
      await save();
      expect(screen.getByRole("alert")).toHaveTextContent("could not be saved");
      expect(screen.getByTestId("select-delivery-method-a")).toHaveValue("Mail");
      expect(screen.getByTestId("button-generate-closing-disclosure")).toBeEnabled();
      expect(screen.queryByTestId("button-view-closing-disclosure")).not.toBeInTheDocument();
      expect(screen.getByTestId("button-deliver-closing-disclosure")).toBeEnabled();
      expect(loadClosingDisclosures("test")[0].borrowerDetails).toBeUndefined();
    } finally { spy.mockRestore(); }
    await save();
    expect(loadClosingDisclosures("test")[0].borrowerDetails![0].deliveryMethod).toBe("Mail");
  });

  it("keeps an in-flight save visible and blocks duplicate saves or misleading cancellation", async () => {
    setup(); edit(); change("select-delivery-method-a", "Mail");
    let commit!: () => void;
    const request = vi.fn((_key: string, write: () => void) => new Promise<void>((resolve) => {
      commit = () => { write(); resolve(); };
    }));
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    try {
      fireEvent.click(screen.getByTestId("button-save-borrower-edit-1"));
      expect(screen.getByTestId("button-save-borrower-edit-1")).toBeDisabled();
      expect(screen.getByTestId("button-cancel-borrower-edit-1")).toBeDisabled();
      fireEvent.click(screen.getByTestId("button-save-borrower-edit-1"));
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(request).toHaveBeenCalledTimes(1);
      await act(async () => { commit(); });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(loadClosingDisclosures("test")[0].borrowerDetails![0].deliveryMethod).toBe("Mail");
    } finally {
      Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    }
  });

  it("updates summaries after a native cross-tab event", () => {
    setup();
    const saved = { ...record, borrowerDetails: borrowers.map((item) => ({ ...blankBorrowerDetails(item.id), cdViewed: "Yes" as const })) };
    act(() => {
      localStorage.setItem(closingDisclosureStorageKey("test"), JSON.stringify([saved]));
      window.dispatchEvent(new StorageEvent("storage", { key: closingDisclosureStorageKey("test"), storageArea: localStorage }));
    });
    expect(screen.getByTestId("button-view-borrower-status-1")).toHaveTextContent("3 of 3 viewed");
  });

  it("shows a conflict without discarding the draft or overriding remote changes", async () => {
    setup(); edit(); change("select-delivery-method-a", "Mail");
    act(() => updateClosingDisclosureHistory("test", (history) => ({
      ...history, records: [{ ...record, borrowerDetails: [{ ...blankBorrowerDetails("a"), deliveryMethod: "Blend" }] }],
    })));
    await save();
    expect(screen.getByRole("alert")).toHaveTextContent("changed in another window");
    expect(screen.getByTestId("select-delivery-method-a")).toHaveValue("Mail");
    expect(loadClosingDisclosures("test")[0].borrowerDetails![0].deliveryMethod).toBe("Blend");
  });

  it("reset while editing dismisses the editor and discards its details", async () => {
    setup(); edit(); change("select-cd-viewed-a", "Yes");
    await act(async () => { await resetClosingDisclosureHistory("test", true); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(loadClosingDisclosures("test")).toEqual([]);
  });

  it("toolbar delivery overwrites delivery fields for all borrowers but preserves viewing and new-generation defaults", async () => {
    setup(); edit();
    change("select-delivery-method-a", "Hand Delivery");
    change("input-delivery-date-a", "2026-10-01");
    change("select-cd-viewed-a", "Yes");
    change("input-viewed-date-a", "2026-10-06");
    change("select-cd-viewed-b", "No");
    await save();
    const before = loadClosingDisclosures("test")[0].borrowerDetails!;
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 9, 14, 14, 15));
      fireEvent.click(screen.getByTestId("button-deliver-closing-disclosure"));
      const delivered = loadClosingDisclosures("test")[0];
      for (const borrower of borrowers) {
        const detail = delivered.borrowerDetails!.find((item) => item.borrowerId === borrower.id)!;
        expect(detail.deliveryMethod).toBe("Blend");
        expect(detail.deliveryDate).toBe("2026-10-14");
        expect(detail.cdViewed).toBe(before.find((item) => item.borrowerId === borrower.id)!.cdViewed);
        expect(detail.viewedDate).toBe(before.find((item) => item.borrowerId === borrower.id)!.viewedDate);
      }
      expect(screen.getByTestId("text-delivery-method-1")).toHaveTextContent("Blend");
      expect(screen.getByTestId("text-delivery-date-1")).toHaveTextContent("10/14/2026");
      expect(screen.getByTestId("button-deliver-closing-disclosure")).toBeDisabled();
      expect(screen.getByTestId("button-view-borrower-status-1")).toHaveTextContent("1 of 3 viewed · Requirement met");
      edit();
      for (const borrower of borrowers) {
        expect(screen.getByTestId(`select-delivery-method-${borrower.id}`)).toHaveValue("Blend");
        expect(screen.getByTestId(`input-delivery-date-${borrower.id}`)).toHaveValue("2026-10-14");
      }
      expect(screen.getByTestId("input-viewed-date-a")).toHaveValue("2026-10-06");
      fireEvent.click(screen.getByTestId("button-cancel-borrower-edit-1"));
      fireEvent.click(screen.getByTestId("button-generate-closing-disclosure"));
      act(() => vi.advanceTimersByTime(5000));
      expect(loadClosingDisclosures("test")[1].borrowerDetails).toEqual(delivered.borrowerDetails);
      expect(loadClosingDisclosures("test")[0].borrowerDetails).toBeUndefined();
      expect(screen.getByTestId("text-delivery-method-2")).toHaveTextContent("Not recorded");
      expect(screen.getByTestId("button-deliver-closing-disclosure")).toBeEnabled();
    } finally { vi.useRealTimers(); }
  });

  it("retains delivered borrower fields after remount and permits manual corrections afterward", async () => {
    const view = setup([borrowers[0]]);
    fireEvent.click(screen.getByTestId("button-deliver-closing-disclosure"));
    const delivered = loadClosingDisclosures("test")[0];
    const deliveryDate = delivered.borrowerDetails![0].deliveryDate;
    view.unmount();
    render(<ChecklistProvider><ClosingDocumentsContent loanId="test" borrowers={[borrowers[0]]} /></ChecklistProvider>);
    edit();
    expect(screen.getByTestId("select-delivery-method-a")).toHaveValue("Blend");
    expect(screen.getByTestId("input-delivery-date-a")).toHaveValue(deliveryDate);
    change("select-delivery-method-a", "Mail");
    change("input-delivery-date-a", "2026-10-10");
    await save();
    expect(screen.getByTestId("text-delivery-method-1")).toHaveTextContent("Mail");
    expect(loadClosingDisclosures("test")[0].deliveredAt).toBe(delivered.deliveredAt);
    expect(screen.getByTestId("button-deliver-closing-disclosure")).toBeDisabled();
  });
});
