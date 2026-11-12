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
it.each([true, false])("shows an empty secondary income section and allows adding a source (missing record: %s)", missingRecord => {
  const income = [structuredClone(SAMPLE_BORROWERS[0])];
  if (!missingRecord) income.push({ ...SAMPLE_BORROWERS[1], incomeSources: [] });
  state.document = { loan: { id: "empty-income" }, borrowers: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    sections: { income } };
  render(<BorrowerFinancialsContent />);
  expect(screen.getByTestId("chip-primary-wage-earner")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("tab-borrower-1"));
  expect(screen.getByText("No income reported for this borrower")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("button-add-income-source"));
  expect(screen.queryByText("No income reported for this borrower")).not.toBeInTheDocument();
  expect(state.document.sections.income[1].incomeSources).toHaveLength(1);
  expect(state.document.sections.income[0]).toEqual(SAMPLE_BORROWERS[0]);
});
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
