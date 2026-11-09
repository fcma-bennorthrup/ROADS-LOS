import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BorrowerFinancialsContent } from "../BorrowerFinancialsContent";
import { blendDemoSections } from "@/lib/blend-demo-fixture";
import { populateDemoCredit } from "@shared/demo-credit";

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
  expect(screen.getByText("DEMO-1-101")).toBeInTheDocument();
  expect(screen.queryByText("DEMO-2-101")).toBeNull();
  fireEvent.click(screen.getByTestId("tab-borrower-1"));
  expect(screen.getAllByTestId(/^liability-card-/)).toHaveLength(4);
  expect(screen.getByText("DEMO-2-101")).toBeInTheDocument();
  expect(screen.queryByText("DEMO-1-101")).toBeNull();
  expect(screen.queryAllByTestId(/^asset-card-/)).toHaveLength(0);
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
  expect(screen.getByText("DEMO-1-101")).toBeInTheDocument();
  expect(screen.queryByTestId("button-save-liability-1")).toBeNull();
  view.unmount();
  render(<BorrowerFinancialsContent />);
  fireEvent.click(screen.getByTestId("tab-borrower-1"));
  expect(screen.queryByText("DEMO-1-101")).toBeNull();
  expect(screen.queryByText("DEMO-2-101")).toBeNull();
});
