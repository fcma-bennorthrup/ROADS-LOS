import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BorrowerFinancialsContent } from "../BorrowerFinancialsContent";
import { blendDemoSections } from "@shared/loan-events/test-fixtures";
import { populateDemoCredit } from "@shared/demo-credit";
import { LIABILITY_EXCLUSIONS } from "@shared/liability-exclusions";

const state = vi.hoisted(() => ({ document: null as any }));
vi.mock("@/lib/loan-application-store", () => ({ applicationStore: state }));
vi.mock("@/contexts/loan-application-context", () => ({
  useApplicationStatus: () => state,
  useLoanEditing: () => {},
  useLoanState: (key: string, initial: any) => {
    const [value, set] = useState(() => state.document.sections[key] ?? initial);
    return [value, (updater: any) => {
      const next = typeof updater === "function" ? updater(state.document.sections[key] ?? initial) : updater;
      state.document.sections[key] = next;
      set(next);
    }];
  },
}));
afterEach(cleanup);

it("saves the exclusion and last four digits, restores them on remount, and discards edits", () => {
  state.document = populateDemoCredit(imported(1));
  let view = render(<BorrowerFinancialsContent />);
  let card = screen.getAllByTestId("liability-card-0")[0];
  fireEvent.click(within(card).getByTestId("button-edit-liability-0"));
  fireEvent.click(within(card).getByTestId("select-exclusion"));
  for (const reason of LIABILITY_EXCLUSIONS) {
    expect(screen.getByTestId(`select-exclusion-option-${reason.toLowerCase().replace(/[\s\/]+/g, "-")}`)).toBeInTheDocument();
  }
  fireEvent.click(screen.getByTestId("select-exclusion-option-paid-by-someone-else"));
  const account = within(within(card).getByTestId("field-last-4-of-account-number")).getByRole("textbox");
  fireEvent.change(account, { target: { value: "0012" } });
  fireEvent.click(within(card).getByTestId("button-save-liability-0"));
  expect(state.document.sections["current-liabilities"][0]).toMatchObject({ accountNumber: "0012", exclusion: "Paid by someone else" });
  view.unmount();
  view = render(<BorrowerFinancialsContent />);
  card = screen.getAllByTestId("liability-card-0")[0];
  expect(within(card).getByText("0012")).toBeInTheDocument();
  expect(within(card).getByText("Paid by someone else")).toBeInTheDocument();
  fireEvent.click(within(card).getByTestId("button-edit-liability-0"));
  fireEvent.click(within(card).getByTestId("select-exclusion"));
  fireEvent.click(screen.getByTestId("select-exclusion-option-not-excluded"));
  fireEvent.click(within(card).getByTestId("button-discard-liability-0"));
  expect(within(card).getByText("Paid by someone else")).toBeInTheDocument();
});

function imported(count: 1 | 2) {
  return { loan: { id: "demo" }, borrowers: [
    { id: "demo-primary", name: "Richard Jamerson" },
    ...(count === 2 ? [{ id: "demo-secondary", name: "Jane Jamerson" }] : []),
  ], sections: blendDemoSections("demo", count), revision: 1, generation: 1 } as any;
}

it.each([1, 2] as const)("imports %i borrowers without liabilities", count => {
  state.document = imported(count);
  render(<BorrowerFinancialsContent />);
  expect(state.document.sections["current-liabilities"]).toEqual([]);
  expect(state.document.sections["noncurrent-liabilities"]).toEqual([]);
  expect(screen.queryAllByTestId(/^liability-card-/)).toHaveLength(0);
  if (count === 2) {
    fireEvent.click(screen.getByTestId("tab-borrower-1"));
    expect(screen.queryAllByTestId(/^liability-card-/)).toHaveLength(0);
  }
});

it("switches borrower balance sheets and isolates edits, additions and deletions after credit", () => {
  state.document = populateDemoCredit(imported(2));
  const view = render(<BorrowerFinancialsContent />);
  expect(screen.getAllByTestId(/^liability-card-/)).toHaveLength(4);
  for (const card of screen.getAllByTestId(/^liability-card-/)) {
    expect(within(card).queryByText("Richard Jamerson")).toBeNull();
  }
   expect(screen.getByText("1101")).toBeInTheDocument();
   expect(screen.queryByText("2101")).toBeNull();
  fireEvent.click(screen.getByTestId("tab-borrower-1"));
  expect(screen.getAllByTestId(/^liability-card-/)).toHaveLength(4);
   expect(screen.getByText("2101")).toBeInTheDocument();
   expect(screen.queryByText("1101")).toBeNull();
  const secondaryAssets = ["current-assets", "noncurrent-assets"].flatMap(key =>
    state.document.sections[key].filter((row: any) => row.borrowerId === "demo-secondary"));
  expect(screen.queryAllByTestId(/^asset-card-/)).toHaveLength(secondaryAssets.length);
  const primaryBefore = structuredClone(state.document.sections["current-liabilities"].filter((r: any) => r.borrowerId === "demo-primary"));
  const card = screen.getAllByTestId("liability-card-0")[0];
  fireEvent.click(within(card).getByTestId("button-edit-liability-0"));
  const inputs = within(card).getAllByRole("textbox");
  fireEvent.change(inputs[0], { target: { value: "Updated creditor" } });
  fireEvent.click(within(card).getByTestId("button-save-liability-0"));
  expect(state.document.sections["current-liabilities"].find((r: any) => r.borrowerId === "demo-secondary").creditorName).toBe("Updated creditor");
  fireEvent.click(within(card).getByTestId("button-more-liability-0"));
  fireEvent.click(within(card).getByTestId("button-delete-liability-0"));
  fireEvent.click(screen.getByTestId("button-add-current-liabilities"));
  expect(state.document.sections["current-liabilities"].filter((r: any) => r.borrowerId === "demo-primary")).toEqual(primaryBefore);
  expect(state.document.sections["current-liabilities"].filter((r: any) => r.borrowerId === "demo-secondary")).toHaveLength(2);
  fireEvent.click(screen.getByTestId("tab-borrower-0"));
   expect(screen.getByText("1101")).toBeInTheDocument();
  expect(screen.queryByTestId("button-save-liability-1")).toBeNull();
  view.unmount();
  render(<BorrowerFinancialsContent />);
  fireEvent.click(screen.getByTestId("tab-borrower-1"));
   expect(screen.queryByText("1101")).toBeNull();
   expect(screen.queryByText("2101")).toBeNull();
});
