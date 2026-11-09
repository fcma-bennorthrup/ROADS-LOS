import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BorrowerFinancialsContent, SAMPLE_BORROWERS } from "../BorrowerFinancialsContent";

const state = vi.hoisted(() => ({ document: null as any }));
vi.mock("@/lib/loan-application-store", () => ({ applicationStore: state }));
vi.mock("@/contexts/loan-application-context", () => ({
  useApplicationStatus: () => state,
  useLoanEditing: () => {},
  useLoanState: () => {
    const [value, set] = useState(state.document.sections.income);
    return [value, (updater: any) => {
      const next = typeof updater === "function" ? updater(value) : updater;
      state.document.sections.income = next;
      set(next);
    }];
  },
}));
vi.mock("../BalanceSheetSection", () => ({ BalanceSheetSection: () => null }));
afterEach(cleanup);
it("moves the chip only after saving a higher income and preserves it after remount", () => {
  state.document = { loan: { id: "pwe" }, borrowers: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    sections: { income: structuredClone(SAMPLE_BORROWERS) } };
  const view = render(<BorrowerFinancialsContent />);
  expect(screen.getByTestId("chip-primary-wage-earner")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("tab-borrower-1"));
  expect(screen.queryByTestId("chip-primary-wage-earner")).toBeNull();
  fireEvent.click(screen.getByTestId("button-edit-income-0"));
  fireEvent.change(screen.getByTestId("input-base-employment-income"), { target: { value: "150000" } });
  expect(screen.queryByTestId("chip-primary-wage-earner")).toBeNull();
  fireEvent.click(screen.getByTestId("button-save-income-0"));
  expect(screen.getByTestId("chip-primary-wage-earner")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("tab-borrower-0"));
  expect(screen.queryByTestId("chip-primary-wage-earner")).toBeNull();
  view.unmount();
  render(<BorrowerFinancialsContent />);
  fireEvent.click(screen.getByTestId("tab-borrower-1"));
  expect(screen.getByTestId("chip-primary-wage-earner")).toBeInTheDocument();
});
