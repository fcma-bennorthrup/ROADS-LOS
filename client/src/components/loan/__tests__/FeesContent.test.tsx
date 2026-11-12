import { useState, type SetStateAction } from "react";
import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeeRow } from "@shared/fees";
import { FeesContent } from "../FeesContent";
import { Toaster } from "@/components/ui/toaster";
import { dismissToasts } from "@/hooks/use-toast";
import { EMPTY_CIRCUMSTANCES, type FeeCircumstances } from "@shared/fee-circumstances";

function renderFeesWithToaster() {
  return render(<><FeesContent /><Toaster /></>);
}

afterEach(() => {
  cleanup();
  vi.useFakeTimers();
  dismissToasts();
  vi.advanceTimersByTime(300);
  vi.useRealTimers();
});

const mocks = vi.hoisted(() => ({
  rows: [] as FeeRow[],
  stored: [] as FeeRow[],
  editing: vi.fn(),
  flush: vi.fn(),
  circumstances: { pending: [], records: [] } as FeeCircumstances,
}));
vi.mock("@/contexts/loan-application-context", () => ({
  useLoanState: (key: string) => {
    const [circumstances, setCircumstances] = useState(mocks.circumstances);
    const [rows, setRows] = useState(mocks.rows);
    if (key === "fee-circumstances") return [circumstances, (next: SetStateAction<FeeCircumstances>) => setCircumstances(previous => {
      const value = typeof next === "function" ? next(previous) : next;
      mocks.circumstances = value;
      return value;
    })];
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
  mocks.circumstances = { ...EMPTY_CIRCUMSTANCES };
  mocks.stored = [];
  mocks.editing.mockClear();
  mocks.flush.mockReset().mockResolvedValue(undefined);
});

describe("FeesContent", () => {
  it.each([{ random: 0, amount: "400.00" }, { random: 0.999999, amount: "2000.00" }])(
    "prefills prepaid interest with $amount and keeps it when added", async ({ random, amount }) => {
      const user = userEvent.setup();
      render(<FeesContent />);
      const spy = vi.spyOn(Math, "random").mockReturnValue(random);
      try {
        await user.click(screen.getByTestId("select-fee-type"));
        await user.click(screen.getByRole("button", { name: /^Prepaid Interest$/ }));
        expect(screen.getByTestId("input-le-amount")).toHaveValue(amount);
        expect(screen.getByTestId("input-cd-amount")).toHaveValue(amount);
        await user.click(screen.getByTestId("button-add-fee"));
        expect(mocks.stored[0]).toMatchObject({ fee: "Prepaid Interest", leAmount: amount, cdAmount: amount });
        await user.click(screen.getByTestId("button-save-fee-table"));
        expect(mocks.flush).toHaveBeenCalled();
        expect(mocks.stored[0].cdAmount).toBe(amount);
      } finally { spy.mockRestore(); }
    },
  );
  it("allows overriding the prepaid interest amount before adding", async () => {
    const user = userEvent.setup();
    render(<FeesContent />);
    await user.click(screen.getByTestId("select-fee-type"));
    await user.click(screen.getByRole("button", { name: /^Prepaid Interest$/ }));
    await user.clear(screen.getByTestId("input-cd-amount"));
    await user.type(screen.getByTestId("input-cd-amount"), "750.50");
    await user.click(screen.getByTestId("button-add-fee"));
    expect(mocks.stored[0].cdAmount).toBe("750.50");
  });
  it("saves waived status, shows its checkmark, and supports unwaiving", async () => {
    mocks.rows = [{ id: "waiver", fee: "Credit Report Fee", leAmount: "50", cdAmount: "50", methodOfPayment: "Cash", paidBy: "Buyer" }];
    const user = userEvent.setup();
    render(<FeesContent />);
    expect(screen.getByRole("columnheader", { name: "Waived" })).toBeInTheDocument();
    expect(screen.queryByTestId("fee-waived-waiver")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("button-edit-fee-waiver"));
    await user.click(screen.getByRole("checkbox", { name: "Waive entire fee" }));
    await user.click(screen.getByTestId("button-save-edit-fee"));
    await waitFor(() => expect(screen.getByTestId("fee-waived-waiver")).toBeInTheDocument());
    expect(mocks.stored[0].waived).toBe(true);
    expect(mocks.stored[0]).toMatchObject({ leAmount: "0.00", cdAmount: "0.00" });
    await user.click(screen.getByTestId("button-edit-fee-waiver"));
    expect(screen.getByRole("checkbox", { name: "Waive entire fee" })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Waive entire fee" }));
    await user.click(screen.getByTestId("button-save-edit-fee"));
    await waitFor(() => expect(screen.queryByTestId("fee-waived-waiver")).not.toBeInTheDocument());
    expect(mocks.stored[0]).toMatchObject({ waived: false, leAmount: "50.00", cdAmount: "50.00" });
  });
  it("subtracts a partial waiver once and rejects an excessive waiver", async () => {
    mocks.rows = [{ id: "partial", fee: "Credit Report Fee", leAmount: "100", cdAmount: "150", methodOfPayment: "Cash", paidBy: "Buyer" }];
    const user = userEvent.setup();
    render(<FeesContent />);
    await user.click(screen.getByTestId("button-edit-fee-partial"));
    await user.type(screen.getByRole("textbox", { name: "Amount to waive" }), "25.50");
    await user.click(screen.getByTestId("button-save-edit-fee"));
    await waitFor(() => expect(mocks.stored[0]).toMatchObject({ leAmount: "74.50", cdAmount: "124.50", waived: true }));
    await user.click(screen.getByTestId("button-edit-fee-partial"));
    await user.click(screen.getByTestId("button-save-edit-fee"));
    await waitFor(() => expect(screen.queryByTestId("fee-edit-dialog")).not.toBeInTheDocument());
    expect(mocks.stored[0]).toMatchObject({ leAmount: "74.50", cdAmount: "124.50" });
    await user.click(screen.getByTestId("button-edit-fee-partial"));
    await user.clear(screen.getByRole("textbox", { name: "Amount to waive" }));
    await user.type(screen.getByRole("textbox", { name: "Amount to waive" }), "101");
    await user.click(screen.getByTestId("button-save-edit-fee"));
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot exceed");
    expect(mocks.stored[0]).toMatchObject({ leAmount: "74.50", cdAmount: "124.50" });
  });
  it("requests a reason on table save after appraisal edits, persists it, and does not repeat unchanged", async () => {
    mocks.rows = [{ id: "appraisal", fee: "Appraisal Fee", leAmount: "500", cdAmount: "500", methodOfPayment: "Cash", paidBy: "Buyer" }];
    const user = userEvent.setup();
    render(<FeesContent />);
    await user.click(screen.getByTestId("button-edit-fee-appraisal"));
    const editor = within(screen.getByRole("dialog", { name: "Edit Fee" }));
    await user.clear(editor.getByLabelText("LE Amount"));
    await user.type(editor.getByLabelText("LE Amount"), "650");
    await user.click(editor.getByRole("button", { name: /^Save$/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByTestId("button-save-fee-table"));
    const dialog = within(await screen.findByRole("dialog", { name: "Change of circumstance reason" }));
    await user.click(dialog.getByTestId("select-circumstance-reason"));
    await user.click(screen.getByRole("button", { name: /^Not a valid change of circumstance$/ }));
    await user.type(dialog.getByLabelText("Context"), "Corrected an internal estimate.");
    await user.click(dialog.getByTestId("button-save-change-circumstance"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.circumstances.records).toHaveLength(1);
    expect(mocks.circumstances.records[0]).toMatchObject({ reason: "not-valid", context: "Corrected an internal estimate." });
    expect(mocks.circumstances.pending).toEqual([]);
    await user.click(screen.getByTestId("button-save-fee-table"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  const existingFee: FeeRow = {
    id: "edit-target", fee: "Appraisal Fee", methodOfPayment: "Financed", paidBy: "Seller",
    paidTo: "Harbor Valuations", leAmount: "427.15", cdAmount: "438.90", shoppedForProvider: true,
  };

  async function openEditor() {
    const user = userEvent.setup();
    render(<FeesContent />);
    await user.click(screen.getByTestId("button-edit-fee-edit-target"));
    return { user, dialog: within(screen.getByRole("dialog", { name: "Edit Fee" })) };
  }

  it("groups delete and edit in one action column and leaves table cells read-only", async () => {
    mocks.rows = [existingFee];
    const { dialog } = await openEditor();
    expect(dialog.getByLabelText("Fee")).toHaveValue("Appraisal Fee");
    expect(dialog.getByLabelText("Method of Payment")).toHaveTextContent("Financed");
    expect(dialog.getByLabelText("Paid By")).toHaveTextContent("Seller");
    expect(dialog.getByLabelText("Paid To")).toHaveValue("Harbor Valuations");
    expect(dialog.getByLabelText("LE Amount")).toHaveValue("427.15");
    expect(dialog.getByLabelText("CD Amount")).toHaveValue("438.90");
    expect(dialog.getByRole("checkbox", { name: "Shopped for Provider" })).toBeChecked();
    expect(dialog.getAllByRole("button", { name: "Close" })).toHaveLength(1);
    expect(screen.getAllByRole("columnheader", { hidden: true }).slice(-1).map(cell => cell.getAttribute("aria-label")))
      .toEqual(["Actions"]);
    const editButton = screen.getAllByTestId(/^button-edit-fee-/)[0];
    const actions = editButton.parentElement!;
    expect(within(actions).getAllByRole("button", { hidden: true })).toHaveLength(2);
    expect(actions.style.gap).toBe("var(--roads-spacing-component-m)");
    expect(actions.style.padding).toBe("var(--roads-spacing-component-xs) var(--roads-spacing-component-l)");
    expect(within(screen.getByTestId("fee-row-edit-target")).queryByRole("textbox", { hidden: true })).toBeNull();
    expect(mocks.editing).toHaveBeenCalledWith("fee-edit-edit-target", false);
  });

  it("saves all fields as text, preserves row identity and unknown fields, and changes only the selected row", async () => {
    const unknownFields = { importedCode: "V-178", metadata: { origin: "legacy" } };
    const other: FeeRow = { ...existingFee, id: "untouched", fee: "Credit Report Fee" };
    mocks.rows = [{ ...existingFee, ...unknownFields }, other];
    const { user, dialog } = await openEditor();
    for (const [label, value] of [
      ["Fee", "Independent Valuation"], ["Paid To", "Pacific Appraisers"],
      ["LE Amount", "00187.250"], ["CD Amount", "196.40"],
    ]) {
      await user.clear(dialog.getByLabelText(label));
      await user.type(dialog.getByLabelText(label), value);
    }
    await user.click(dialog.getByLabelText("Method of Payment"));
    await user.click(dialog.getByTestId("select-edit-method-of-payment-option-cash"));
    await user.click(dialog.getByLabelText("Paid By"));
    await user.click(dialog.getByTestId("select-edit-paid-by-option-buyer"));
    await user.click(dialog.getByRole("checkbox", { name: "Shopped for Provider" }));
    expect(mocks.editing).toHaveBeenCalledWith("fee-edit-edit-target", true);
    expect(mocks.stored).toEqual([]);
    await user.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.flush).toHaveBeenCalledOnce();
    expect(mocks.stored[0]).toEqual({
      id: existingFee.id, ...unknownFields, fee: "Independent Valuation", methodOfPayment: "Cash",
      paidBy: "Buyer", paidTo: "Pacific Appraisers", leAmount: "00187.250", cdAmount: "196.40",
      shoppedForProvider: false, waived: false,
    });
    expect(mocks.stored[1]).toBe(other);
  });

  it.each(["Cancel", "Close", "Escape"])("discards edits on %s without writing or flushing", async dismissal => {
    mocks.rows = [existingFee];
    const { user, dialog } = await openEditor();
    await user.type(dialog.getByLabelText("Paid To"), " discarded");
    if (dismissal === "Escape") await user.keyboard("{Escape}");
    else await user.click(dialog.getByRole("button", { name: dismissal }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.stored).toEqual([]);
    expect(mocks.flush).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("button-edit-fee-edit-target"));
    expect(within(screen.getByRole("dialog")).getByLabelText("Paid To")).toHaveValue(existingFee.paidTo);
  });

  it("keeps the editor open and prevents duplicate save and dismissal until persistence completes", async () => {
    let resolveFlush!: () => void;
    mocks.flush.mockImplementation(() => new Promise<void>(resolve => { resolveFlush = resolve; }));
    mocks.rows = [existingFee];
    const { user, dialog } = await openEditor();
    await user.click(dialog.getByRole("button", { name: "Save" }));
    expect(dialog.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Close" })).toBeDisabled();
    expect(dialog.getByLabelText("Fee")).toBeDisabled();
    await user.click(dialog.getByRole("button", { name: "Saving…" }));
    await user.click(dialog.getByRole("button", { name: "Cancel" }));
    await user.click(dialog.getByRole("button", { name: "Close" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.flush).toHaveBeenCalledOnce();
    resolveFlush();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("retains the draft on flush failure and allows an explicit retry", async () => {
    mocks.rows = [existingFee];
    mocks.flush.mockRejectedValueOnce(new Error("Connection unavailable")).mockResolvedValue(undefined);
    const { user, dialog } = await openEditor();
    await user.clear(dialog.getByLabelText("Paid To"));
    await user.type(dialog.getByLabelText("Paid To"), "Retry recipient");
    await user.click(dialog.getByRole("button", { name: "Save" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("Fee not saved. Connection unavailable");
    expect(dialog.getByLabelText("Paid To")).toHaveValue("Retry recipient");
    expect(dialog.getByRole("button", { name: "Save" })).not.toBeDisabled();
    await user.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.flush).toHaveBeenCalledTimes(2);
    expect(mocks.stored[0].paidTo).toBe("Retry recipient");
  });

  it("opens and saves a legacy fee with missing optional fields without losing other data", async () => {
    const { paidTo: _paidTo, shoppedForProvider: _shopped, ...legacy } = existingFee;
    mocks.rows = [legacy];
    const { user, dialog } = await openEditor();
    expect(dialog.getByLabelText("Paid To")).toHaveValue("");
    expect(dialog.getByRole("checkbox", { name: "Shopped for Provider" })).not.toBeChecked();
    await user.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.stored).toEqual([{ ...legacy, paidTo: "", shoppedForProvider: false, waived: false }]);
  });

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
    renderFeesWithToaster();
    await user.type(screen.getByLabelText("Paid To"), "Not added");
    await user.click(screen.getByTestId("button-save-fee-table"));
    await waitFor(() => expect(mocks.flush).toHaveBeenCalledOnce());
    expect(screen.getByTestId("toast-success")).toHaveTextContent("Fee table saved.Add the current fee to include it in the table.");
    expect(screen.getByLabelText("Paid To")).toHaveValue("Not added");
    expect(within(screen.getByTestId("fees-actions")).queryByRole("status")).toBeNull();
    expect(mocks.stored).toEqual([]);
  });

  it("waits for flush, preserves focus, and replaces the toast on repeated successful saves", async () => {
    let resolveFlush!: () => void;
    mocks.flush.mockImplementationOnce(() => new Promise<void>(resolve => { resolveFlush = resolve; }));
    const user = userEvent.setup();
    renderFeesWithToaster();
    const save = screen.getByTestId("button-save-fee-table");
    await user.click(save);
    expect(save).toBeDisabled();
    expect(screen.queryByTestId("toast-success")).toBeNull();
    await user.click(save);
    expect(mocks.flush).toHaveBeenCalledOnce();
    await act(async () => resolveFlush());
    const first = screen.getByTestId("toast-success");
    expect(first).toHaveTextContent("Fee table saved.");
    expect(first).not.toHaveTextContent("Add the current fee");
    expect(save).toHaveFocus();
    expect(within(screen.getByTestId("fees-actions")).queryByText("Fee table saved.")).toBeNull();
    await user.click(save);
    expect(mocks.flush).toHaveBeenCalledTimes(2);
    expect(screen.getAllByTestId("toast-success")).toHaveLength(1);
    expect(screen.getByTestId("toast-success")).not.toBe(first);
    fireEvent.click(within(screen.getByTestId("toast-success")).getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByTestId("toast-success")).toBeNull();
  });

  it("auto-dismisses five seconds after success", async () => {
    vi.useFakeTimers();
    renderFeesWithToaster();
    await act(async () => fireEvent.click(screen.getByTestId("button-save-fee-table")));
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByTestId("toast-success")).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByTestId("toast-success")).toBeNull();
  });

  it.each(["hover", "focus"])("pauses dismissal during %s and resumes afterward", async (interaction) => {
    vi.useFakeTimers();
    renderFeesWithToaster();
    await act(async () => fireEvent.click(screen.getByTestId("button-save-fee-table")));
    act(() => vi.advanceTimersByTime(2000));
    const viewport = screen.getByTestId("toast-viewport");
    const close = within(screen.getByTestId("toast-success")).getByRole("button", { name: "Dismiss notification" });
    if (interaction === "hover") fireEvent.pointerMove(viewport);
    else act(() => close.focus());
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByTestId("toast-success")).toHaveAttribute("data-state", "open");
    if (interaction === "hover") fireEvent.pointerLeave(viewport.parentElement!);
    else act(() => screen.getByTestId("button-save-fee-table").focus());
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByTestId("toast-success")).toHaveAttribute("data-state", "open");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByTestId("toast-success")).toBeNull();
  });

  it("reports persistence errors honestly", async () => {
    mocks.flush.mockRejectedValue(new Error("Connection unavailable"));
    const user = userEvent.setup();
    renderFeesWithToaster();
    await user.click(screen.getByTestId("button-save-fee-table"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Fee table not saved. Connection unavailable");
    expect(screen.getByTestId("button-save-fee-table")).not.toBeDisabled();
    expect(screen.queryByTestId("toast-success")).toBeNull();
  });
});
