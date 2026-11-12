import { useState, type SetStateAction } from "react";
import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CREDIT_TYPES, type CreditRow } from "@shared/credits";
import { CreditsContent } from "../CreditsContent";
import { SideNav } from "../SideNav";

const mocks = vi.hoisted(() => ({
  rows: [] as CreditRow[], stored: [] as CreditRow[],
  editing: vi.fn(), flush: vi.fn(), toast: vi.fn(), writeError: false,
}));
vi.mock("@/contexts/loan-application-context", () => ({
  useLoanState: (key: string, initial: CreditRow[]) => {
    expect(key).toBe("credits");
    expect(initial).toEqual([]);
    const [rows, setRows] = useState(mocks.rows);
    return [rows, (next: SetStateAction<CreditRow[]>) => {
      if (mocks.writeError) throw new Error("Application unavailable");
      setRows(previous => {
        const value = typeof next === "function" ? next(previous) : next;
        mocks.stored = value;
        return value;
      });
    }];
  },
  useLoanEditing: (key: string, dirty: boolean) => mocks.editing(key, dirty),
}));
vi.mock("@/lib/loan-application-store", () => ({ applicationStore: { flush: mocks.flush } }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

beforeEach(() => {
  mocks.rows = [];
  mocks.stored = [];
  mocks.writeError = false;
  mocks.editing.mockClear();
  mocks.toast.mockClear();
  mocks.flush.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

async function selectType(value: string = CREDIT_TYPES[0]) {
  await userEvent.click(screen.getByLabelText("Credit Type"));
  await userEvent.click(screen.getByRole("button", { name: value }));
}

describe("CreditsContent", () => {
  it("starts empty with the reference columns, action order, footer, and exact credit options", async () => {
    render(<CreditsContent />);
    expect(screen.queryByTestId(/^credit-row-/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Credit Type", "CD Amount", "Description", ""]);
    expect(within(screen.getByTestId("credits-actions")).getAllByRole("button").map(button => button.textContent))
      .toEqual(["Add Credit", "Save Credit Table", "Delete All Credits"]);
    expect(screen.getByTestId("credits-table").getAttribute("style")).toContain("border: 1px solid var(--roads-border-subtle)");
    expect(screen.getByTestId("credits-table-footer")).toHaveStyle({ height: "56px" });
    expect(screen.queryByLabelText("LE Amount")).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Credit Type"));
    expect(CREDIT_TYPES).toEqual(["Lender Credit - Promotion", "Lender Credit - Tolerance Cure", "Seller Credit (Lump Sum)"]);
    for (const value of CREDIT_TYPES) expect(screen.getByRole("button", { name: value })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CREDIT_TYPES[0] }).parentElement?.children).toHaveLength(3);
  });

  it("places Credits below Fees and above Stock and navigates to it", async () => {
    const onItemChange = vi.fn();
    render(<SideNav activeItem="Fees" onItemChange={onItemChange} />);
    expect(screen.getAllByRole("button").slice(-3).map(button => button.textContent)).toEqual(["Fees", "Credits", "Stock"]);
    await userEvent.click(screen.getByTestId("nav-item-credits"));
    expect(onItemChange).toHaveBeenCalledWith("Credits");
  });

  it.each(CREDIT_TYPES)("adds %s with normalized currency, trimmed description, and resets the editor", async value => {
    render(<CreditsContent />);
    await selectType(value);
    fireEvent.change(screen.getByLabelText("CD Amount"), { target: { value: "1247.8" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "  Closing adjustment  " } });
    await userEvent.click(screen.getByTestId("button-add-credit"));
    expect(mocks.stored).toEqual([expect.objectContaining({ creditType: value, cdAmount: "1247.80", description: "Closing adjustment" })]);
    const row = screen.getByTestId(`credit-row-${mocks.stored[0].id}`);
    expect(within(row).getAllByRole("cell").map(cell => cell.textContent)).toEqual([value, "$1,247.80", "Closing adjustment", ""]);
    expect(within(row).getAllByRole("button")).toHaveLength(1);
    expect(screen.getByLabelText("Credit Type")).toHaveTextContent("Select credit type");
    expect(screen.getByLabelText("CD Amount")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(mocks.editing).toHaveBeenLastCalledWith("credit-editor", false);
    expect(mocks.flush).not.toHaveBeenCalled();
  });

  it("requires a type and treats a blank amount as zero", async () => {
    render(<CreditsContent />);
    await userEvent.click(screen.getByTestId("button-add-credit"));
    expect(mocks.stored).toEqual([]);
    await selectType();
    await userEvent.click(screen.getByTestId("button-add-credit"));
    expect(mocks.stored[0].cdAmount).toBe("0.00");
  });

  it.each(["-1", "not money", "Infinity", "1e309"])("retains invalid amount %s and other draft inputs on add", async amount => {
    render(<CreditsContent />);
    await selectType();
    fireEvent.change(screen.getByLabelText("CD Amount"), { target: { value: amount } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Keep draft" } });
    await userEvent.click(screen.getByTestId("button-add-credit"));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid, non-negative CD Amount.");
    expect(screen.getByLabelText("CD Amount")).toHaveValue(amount);
    expect(screen.getByLabelText("Description")).toHaveValue("Keep draft");
    expect(screen.getByLabelText("Credit Type")).toHaveTextContent(CREDIT_TYPES[0]);
    expect(mocks.stored).toEqual([]);
    expect(mocks.editing).toHaveBeenLastCalledWith("credit-editor", true);
  });

  it.each(["Credit Type", "CD Amount", "Description"])("guards an unadded %s change", async label => {
    render(<CreditsContent />);
    expect(mocks.editing).toHaveBeenLastCalledWith("credit-editor", false);
    if (label === "Credit Type") await selectType();
    else fireEvent.change(screen.getByLabelText(label), { target: { value: "1" } });
    expect(mocks.editing).toHaveBeenLastCalledWith("credit-editor", true);
  });

  it("deletes only the selected row, clears all rows without clearing the draft, and saves", async () => {
    mocks.rows = [
      { id: "first", creditType: CREDIT_TYPES[0], cdAmount: "124.27", description: "First" },
      { id: "second", creditType: CREDIT_TYPES[1], cdAmount: "248.39", description: "Second" },
    ];
    render(<CreditsContent />);
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Unadded" } });
    await userEvent.click(screen.getByTestId("button-delete-credit-first"));
    expect(mocks.stored.map(row => row.id)).toEqual(["second"]);
    await userEvent.click(screen.getByTestId("button-delete-all-credits"));
    expect(mocks.stored).toEqual([]);
    expect(screen.queryByTestId(/^credit-row-/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("Unadded");
    expect(mocks.editing).toHaveBeenLastCalledWith("credit-editor", true);
    await userEvent.click(screen.getByTestId("button-save-credit-table"));
    expect(mocks.flush).toHaveBeenCalledOnce();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: "success", title: "Credit table saved.", description: "Add the current credit to include it in the table.", duration: 5000,
    }));
  });

  it("shows save errors, preserves the draft and rows, and supports retry with success toast", async () => {
    mocks.rows = [{ id: "saved", creditType: CREDIT_TYPES[2], cdAmount: "28.75", description: "Saved" }];
    mocks.flush.mockRejectedValueOnce(new Error("Connection unavailable"));
    render(<CreditsContent />);
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Keep me" } });
    await userEvent.click(screen.getByTestId("button-save-credit-table"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Credit table not saved. Connection unavailable");
    expect(screen.getByTestId("credit-row-saved")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("Keep me");
    expect(mocks.toast).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("button-save-credit-table"));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables save while flushing and only announces success after completion", async () => {
    let resolve!: () => void;
    mocks.flush.mockImplementation(() => new Promise<void>(done => { resolve = done; }));
    render(<CreditsContent />);
    await userEvent.click(screen.getByTestId("button-save-credit-table"));
    expect(screen.getByTestId("button-save-credit-table")).toBeDisabled();
    expect(mocks.toast).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("button-save-credit-table"));
    expect(mocks.flush).toHaveBeenCalledOnce();
    await act(async () => resolve());
    expect(screen.getByTestId("button-save-credit-table")).not.toBeDisabled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Your credit changes have been saved." }));
  });

  it("reports add and delete failures without losing the draft or existing rows", async () => {
    mocks.rows = [{ id: "existing", creditType: CREDIT_TYPES[0], cdAmount: "23.41", description: "" }];
    render(<CreditsContent />);
    await selectType();
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Retain" } });
    mocks.writeError = true;
    await userEvent.click(screen.getByTestId("button-add-credit"));
    expect(screen.getByRole("alert")).toHaveTextContent("Application unavailable");
    expect(screen.getByLabelText("Description")).toHaveValue("Retain");
    await userEvent.click(screen.getByTestId("button-delete-credit-existing"));
    expect(screen.getByRole("alert")).toHaveTextContent("Application unavailable");
    expect(screen.getByTestId("credit-row-existing")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("button-delete-all-credits"));
    expect(screen.getByTestId("credit-row-existing")).toBeInTheDocument();
  });
});
