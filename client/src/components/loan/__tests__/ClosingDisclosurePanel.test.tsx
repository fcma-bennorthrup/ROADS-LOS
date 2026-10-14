import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClosingDocumentsContent } from "../DocumentsContent";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { blankBorrowerDetails, type BorrowerDisclosureDetails } from "@/lib/closing-disclosure-borrowers";
import { closingDisclosureStorageKey, loadClosingDisclosures } from "@/lib/closing-disclosure-history";

const borrowers = [
  { id: "a", name: "Primary Person", isPrimary: true },
  { id: "b", name: "Second Person", isPrimary: false },
  { id: "c", name: "Third Person", isPrimary: false },
];
const record = { id: 1, generatedAt: "2026-10-14T12:00:00.000Z", deliveredAt: null };
function setup(details?: BorrowerDisclosureDetails[], roster = borrowers) {
  localStorage.setItem(closingDisclosureStorageKey("panel"), JSON.stringify([{ ...record, borrowerDetails: details }]));
  return render(<ChecklistProvider><ClosingDocumentsContent loanId="panel" borrowers={roster} /></ChecklistProvider>);
}
const edit = () => fireEvent.click(screen.getByTestId("button-edit-closing-disclosure-1"));
const change = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });
const link = (id = "a") => screen.getByTestId(`checkbox-apply-delivery-${id}`);
const badge = (id: string) => screen.getByTestId(`badge-borrower-viewing-${id}`);
const summary = () => screen.getByTestId("button-view-borrower-status-1");
async function save() { await act(async () => { fireEvent.click(screen.getByTestId("button-save-borrower-edit-1")); }); }

describe("Figma Closing Disclosure panel", () => {
  it("uses the reference heading, content, cards and one source checkbox without sample names or dates", () => {
    setup(); edit();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Closing Disclosure Delivery");
    expect(within(dialog).getByText("ROR does not apply. Only one borrower needs to view the CD.")).toBeVisible();
    expect(within(dialog).queryByText("MANUAL BORROWER TRACKING")).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(1);
    expect(link()).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Save Changes" })).toBeEnabled();
    for (const borrower of borrowers) {
      expect(within(dialog).getByRole("heading", { name: borrower.name })).toBeVisible();
      expect(badge(borrower.id)).toHaveTextContent("Viewing Needed");
      expect(screen.getByTestId(`input-delivery-date-${borrower.id}`)).toHaveValue("");
    }
    expect(within(dialog).queryByText("Jamelle Jamerson")).not.toBeInTheDocument();
  });

  it("copies and links only delivery fields, then stops on uncheck without reverting prior copies", async () => {
    setup(); edit();
    change("select-cd-viewed-a", "Yes");
    change("input-viewed-date-a", "2026-10-12");
    change("select-cd-viewed-b", "No");
    change("input-viewed-date-b", "2026-10-13");
    change("select-delivery-method-a", "Mail");
    change("input-delivery-date-a", "2026-10-14");
    fireEvent.click(link());
    expect(link()).toBeChecked();
    change("select-delivery-method-a", "Hand Delivery");
    change("input-delivery-date-a", "2026-10-15");
    for (const borrower of borrowers) {
      expect(screen.getByTestId(`select-delivery-method-${borrower.id}`)).toHaveValue("Hand Delivery");
      expect(screen.getByTestId(`input-delivery-date-${borrower.id}`)).toHaveValue("2026-10-15");
    }
    expect(screen.getByTestId("select-cd-viewed-b")).toHaveValue("No");
    expect(screen.getByTestId("input-viewed-date-b")).toHaveValue("2026-10-13");
    expect(screen.getByTestId("select-cd-viewed-c")).toHaveValue("");
    expect(screen.getByTestId("input-viewed-date-c")).toHaveValue("");
    fireEvent.click(link());
    change("select-delivery-method-a", "Blend");
    expect(screen.getByTestId("select-delivery-method-b")).toHaveValue("Hand Delivery");
    expect(loadClosingDisclosures("panel")[0].borrowerDetails).toBeUndefined();
    await save();
    expect(loadClosingDisclosures("panel")[0].borrowerDetails![1]).toMatchObject({
      deliveryMethod: "Hand Delivery", deliveryDate: "2026-10-15", cdViewed: "No", viewedDate: "2026-10-13",
    });
  });

  it("keeps individual delivery corrections editable and disables linking when another borrower overrides", async () => {
    const details = borrowers.map((borrower) => ({
      ...blankBorrowerDetails(borrower.id), deliveryMethod: "Blend" as const, deliveryDate: "2026-10-14",
    }));
    setup(details); const before = localStorage.getItem(closingDisclosureStorageKey("panel"));
    edit(); expect(link()).toBeChecked();
    expect(localStorage.getItem(closingDisclosureStorageKey("panel"))).toBe(before);
    change("select-delivery-method-b", "Mail");
    expect(link()).not.toBeChecked();
    change("input-delivery-date-a", "2026-10-16");
    expect(screen.getByTestId("input-delivery-date-b")).toHaveValue("2026-10-14");
    await save();
    expect(loadClosingDisclosures("panel")[0].borrowerDetails![1].deliveryMethod).toBe("Mail");
  });

  it("does not reconcile differing saved values on open, and cancelling bulk edits changes nothing", () => {
    const details = borrowers.map((borrower, index) => ({
      ...blankBorrowerDetails(borrower.id), deliveryMethod: index === 0 ? "Mail" as const : "Blend" as const,
      deliveryDate: index === 0 ? "2026-10-14" : "2026-10-15",
    }));
    setup(details); edit();
    expect(link()).not.toBeChecked();
    fireEvent.click(link());
    expect(screen.getByTestId("select-delivery-method-b")).toHaveValue("Mail");
    fireEvent.click(screen.getByTestId("button-cancel-borrower-edit-1"));
    expect(loadClosingDisclosures("panel")[0].borrowerDetails).toEqual(details);
    edit();
    expect(link()).not.toBeChecked();
    expect(screen.getByTestId("select-delivery-method-b")).toHaveValue("Blend");
  });

  it("uses the actual primary even when not first and falls back without inventing a primary role", () => {
    const reordered = [borrowers[1], borrowers[0], borrowers[2]];
    const view = setup(undefined, reordered); edit();
    expect(link()).not.toBeChecked();
    expect(screen.queryByTestId("checkbox-apply-delivery-b")).not.toBeInTheDocument();
    view.unmount();
    setup(undefined, borrowers.map((borrower) => ({ ...borrower, isPrimary: false }))); edit();
    expect(link()).not.toBeChecked();
    expect(screen.queryByText("Primary Borrower")).not.toBeInTheDocument();
    expect(screen.getAllByText("Co-borrower")).toHaveLength(3);
  });

  it("allows a co-borrower Yes without date to satisfy the requirement, preserving No and blank", async () => {
    const view = setup(); edit();
    change("select-cd-viewed-a", "No");
    change("select-cd-viewed-b", "Yes");
    expect(badge("a")).toHaveTextContent("Not viewed");
    expect(badge("b")).toHaveTextContent("Viewed");
    expect(badge("c")).toHaveTextContent("Not recorded");
    await save();
    expect(summary()).toHaveClass("is-success");
    expect(summary()).toHaveTextContent("1 of 3 viewed · Requirement met");
    expect(summary()).not.toHaveTextContent("pending");
    const saved = loadClosingDisclosures("panel")[0];
    expect(saved.borrowerDetails!.map((item) => item.cdViewed)).toEqual(["No", "Yes", ""]);
    expect(saved.borrowerDetails![1].viewedDate).toBe("");
    expect(saved.deliveredAt).toBeNull();
    view.unmount();
    render(<ChecklistProvider><ClosingDocumentsContent loanId="panel" borrowers={borrowers} /></ChecklistProvider>);
    expect(summary()).toHaveClass("is-success");
    edit(); change("select-cd-viewed-b", "No");
    expect(badge("a")).toHaveTextContent("Viewing Needed");
    await save();
    expect(summary()).toHaveClass("is-pending");
    expect(summary()).toHaveTextContent("0 of 3 viewed · Viewing needed");
  });

  it("does not complete from delivery, viewed dates alone, or an unmatched historical Yes", () => {
    setup([{ ...blankBorrowerDetails("old"), cdViewed: "Yes" },
      { ...blankBorrowerDetails("a"), viewedDate: "2026-10-14" }]);
    expect(summary()).toHaveTextContent("Not recorded");
    expect(summary()).not.toHaveClass("is-success");
    fireEvent.click(screen.getByTestId("button-deliver-closing-disclosure"));
    expect(summary()).not.toHaveClass("is-success");
    edit();
    expect(badge("a")).toHaveTextContent("Viewing Needed");
    expect(screen.getByTestId("notice-unmatched-borrowers-1")).toBeVisible();
    expect(link()).toBeChecked();
  });

  it("blocks successful completion and editing of unreadable saved metadata", () => {
    setup([{ ...blankBorrowerDetails("a"), viewedDate: "invalid", cdViewed: "Yes" }]);
    expect(screen.getByTestId("status-cd-viewed-1")).toHaveClass("is-error");
    edit();
    expect(screen.getByRole("alert")).toHaveTextContent("could not be read");
    expect(screen.getByTestId("button-save-borrower-edit-1")).toBeDisabled();
    expect(link()).toBeDisabled();
  });

  it("retains linked drafts on failed save without partially changing persisted values", async () => {
    setup(); edit();
    change("select-delivery-method-a", "Mail");
    change("input-delivery-date-a", "2026-10-14");
    fireEvent.click(link());
    const before = localStorage.getItem(closingDisclosureStorageKey("panel"));
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    try {
      await save();
      expect(link()).toBeChecked();
      expect(screen.getByTestId("select-delivery-method-c")).toHaveValue("Mail");
      expect(screen.getByRole("alert")).toHaveTextContent("could not be saved");
      expect(localStorage.getItem(closingDisclosureStorageKey("panel"))).toBe(before);
    } finally { write.mockRestore(); }
    await save();
    expect(loadClosingDisclosures("panel")[0].borrowerDetails).toHaveLength(3);
  });
});
