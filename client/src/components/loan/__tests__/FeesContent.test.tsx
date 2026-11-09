import { useState, type SetStateAction } from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeeRow } from "@shared/fees";
import { FeesContent } from "../FeesContent";

const mocks = vi.hoisted(() => ({
  rows: [] as FeeRow[],
  stored: [] as FeeRow[],
  editing: vi.fn(),
  flush: vi.fn(),
}));
vi.mock("@/contexts/loan-application-context", () => ({
  useLoanState: () => {
    const [rows, setRows] = useState(mocks.rows);
    return [rows, (next: SetStateAction<FeeRow[]>) => setRows((previous) => {
      const value = typeof next === "function" ? next(previous) : next;
      mocks.stored = value;
      return value;
    })];
  },
  useLoanEditing: (key: string, dirty: boolean) => mocks.editing(key, dirty),
}));
vi.mock("@/lib/loan-application-store", () => ({
  applicationStore: { flush: mocks.flush },
}));

beforeEach(() => {
  mocks.rows = [];
  mocks.stored = [];
  mocks.editing.mockClear();
  mocks.flush.mockReset().mockResolvedValue(undefined);
});

describe("FeesContent", () => {
  it("starts empty with compatible defaults and ordered fields and actions", () => {
    render(<FeesContent />);
    expect(screen.queryByTestId(/^fee-row-/)).not.toBeInTheDocument();
    expect(screen.getByTestId("select-method-of-payment")).toHaveTextContent("Cash");
    expect(screen.getByTestId("select-paid-by")).toHaveTextContent("Buyer");
    expect(screen.getByLabelText("Paid To")).toHaveStyle({ height: "40px", fontWeight: "600", lineHeight: "20px" });
    const checkboxSlot = screen.getByRole("checkbox").parentElement;
    expect(checkboxSlot).toHaveClass("items-end");
    expect(checkboxSlot).toHaveStyle({ height: "40px", lineHeight: "16px" });
    expect(within(screen.getByTestId("fees-field-row")).getAllByRole("button").map((button) => button.getAttribute("aria-label")))
      .toEqual(["Fee", "Method of Payment", "Paid By"]);
    expect(within(screen.getByTestId("fees-actions")).getAllByRole("button").map((button) => button.textContent))
      .toEqual(["Delete All Fees", "Save Fee Table", "Add Fee"]);
    expect(screen.getAllByRole("columnheader").slice(0, 7).map((cell) => cell.textContent))
      .toEqual(["Fee", "Method of Payment", "Paid By", "Paid To", "LE Amount", "CD Amount", "Shopped"]);
  });

  it("stores selected values, renders them, and resets the complete editor after add", async () => {
    const user = userEvent.setup();
    render(<FeesContent />);
    await user.click(screen.getByTestId("select-method-of-payment"));
    await user.click(screen.getByTestId("select-method-of-payment-option-financed"));
    expect(mocks.editing).toHaveBeenLastCalledWith("fee-editor", true);
    await user.click(screen.getByTestId("select-paid-by"));
    await user.click(screen.getByTestId("select-paid-by-option-seller"));
    await user.type(screen.getByLabelText("Paid To"), "Harbor Title");
    await user.type(screen.getByLabelText("LE Amount"), "187.25");
    await user.type(screen.getByLabelText("CD Amount"), "196.40");
    await user.click(screen.getByTestId("checkbox-shopped-for-provider"));
    await user.click(screen.getByTestId("select-fee-type"));
    await user.click(screen.getByTestId("select-fee-type-option-appraisal-fee"));
    await user.click(screen.getByTestId("button-add-fee"));
    expect(mocks.stored).toEqual([expect.objectContaining({
      fee: "Appraisal Fee", methodOfPayment: "Financed", paidBy: "Seller",
      paidTo: "Harbor Title", leAmount: "187.25", cdAmount: "196.40", shoppedForProvider: true,
    })]);
    const row = screen.getByTestId(`fee-row-${mocks.stored[0].id}`);
    expect(within(row).getAllByRole("cell").slice(0, 6).map((cell) => cell.textContent))
      .toEqual(["Appraisal Fee", "Financed", "Seller", "Harbor Title", "$187.25", "$196.40"]);
    expect(screen.getByTestId(`fee-shopped-${mocks.stored[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId("select-fee-type")).toHaveTextContent("Select fee");
    expect(screen.getByTestId("select-method-of-payment")).toHaveTextContent("Cash");
    expect(screen.getByTestId("select-paid-by")).toHaveTextContent("Buyer");
    for (const label of ["Paid To", "LE Amount", "CD Amount"]) expect(screen.getByLabelText(label)).toHaveValue("");
    expect(screen.getByTestId("checkbox-shopped-for-provider")).not.toBeChecked();
    expect(mocks.editing).toHaveBeenLastCalledWith("fee-editor", false);
  });

  it.each(["Paid To", "Shopped for Provider", "Paid By"])("guards an unadded change to %s", async (label) => {
    const user = userEvent.setup();
    render(<FeesContent />);
    if (label === "Paid To") await user.type(screen.getByLabelText(label), "Harbor");
    else if (label === "Shopped for Provider") await user.click(screen.getByRole("checkbox"));
    else {
      await user.click(screen.getByTestId("select-paid-by"));
      await user.click(screen.getByTestId("select-paid-by-option-seller"));
    }
    expect(mocks.editing).toHaveBeenLastCalledWith("fee-editor", true);
  });

  it("renders absent legacy fields blank/unchecked and preserves individual and all-fee deletion", async () => {
    mocks.rows = [
      { id: "legacy", fee: "Credit Report Fee", methodOfPayment: "Cash", paidBy: "Buyer", leAmount: "38.00", cdAmount: "38.00" },
      { id: "other", fee: "Processing Fee", methodOfPayment: "Financed", paidBy: "Seller", leAmount: "95.00", cdAmount: "95.00" },
    ];
    const user = userEvent.setup();
    render(<FeesContent />);
    const cells = within(screen.getByTestId("fee-row-legacy")).getAllByRole("cell");
    expect(cells[3]).toBeEmptyDOMElement();
    expect(cells[6]).toBeEmptyDOMElement();
    await user.click(screen.getByTestId("button-delete-fee-legacy"));
    expect(mocks.stored.map((row) => row.id)).toEqual(["other"]);
    await user.click(screen.getByTestId("button-delete-all-fees"));
    expect(mocks.stored).toEqual([]);
  });

  it("flushes persisted rows, reports success, and does not imply an unadded editor was saved", async () => {
    const user = userEvent.setup();
    render(<FeesContent />);
    await user.type(screen.getByLabelText("Paid To"), "Not added");
    await user.click(screen.getByTestId("button-save-fee-table"));
    await waitFor(() => expect(mocks.flush).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent("Fee table saved. Add the current fee to include it in the table.");
    expect(mocks.stored).toEqual([]);
  });

  it("reports persistence errors honestly", async () => {
    mocks.flush.mockRejectedValue(new Error("Connection unavailable"));
    const user = userEvent.setup();
    render(<FeesContent />);
    await user.click(screen.getByTestId("button-save-fee-table"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Fee table not saved. Connection unavailable");
    expect(screen.getByTestId("button-save-fee-table")).not.toBeDisabled();
  });
});
