import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import LoanSummaryPage from "../../client/src/pages/loan-summary";
import { BorrowerCards } from "../../client/src/components/loan/BorrowerCards";
import { loan, borrowers, rows } from "./fixtures";

const state = vi.hoisted(() => ({
  query: { data: undefined as unknown, isLoading: false, error: null as unknown },
  id: "synthetic", toast: vi.fn(), queryCall: vi.fn(), header: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => { state.queryCall(options); return state.query; },
}));
vi.mock("wouter", () => ({ useParams: () => ({ id: state.id }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock("@/components/loan/LoanHeader", () => ({
  LoanHeader: (props: unknown) => { state.header(props); return <header data-testid="fixture-header" />; },
  BottomToolbar: () => <footer data-testid="fixture-toolbar" />,
}));
vi.mock("@/components/loan/LoanActivityPanel", () => ({
  LoanActivityPanel: () => <aside data-testid="fixture-activity" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.id = "synthetic";
  state.query = { data: { ...loan }, isLoading: false, error: null };
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Summary route mapping and replacement branches", () => {
  it.each([
    ["pending", undefined, true, null, "loading-state", "Loading loan details..."],
    ["error", undefined, false, new Error("private"), "error-state", "Failed to load loan data"],
    ["missing", undefined, false, null, "error-state", "Failed to load loan data"],
    ["null", null, false, null, "error-state", "Failed to load loan data"],
    ["cached error", loan, false, new Error("private"), "error-state", "Failed to load loan data"],
  ])("%s replaces content and all page-owned shell consumers", (_, data, isLoading, error, testId, text) => {
    state.query = { data, isLoading, error };
    render(<LoanSummaryPage />);
    expect(screen.getByTestId(testId).textContent).toBe(text);
    for (const absent of ["fixture-header", "fixture-toolbar", "fixture-activity", "section-summary-ratios", "section-borrower-contacts"])
      expect(screen.queryByTestId(absent)).not.toBeInTheDocument();
  });

  it.each(["synthetic", "alternate", ""])("keeps the exact query key for ID %s", id => {
    state.id = id;
    render(<LoanSummaryPage />);
    expect(state.queryCall).toHaveBeenCalledWith({ queryKey: ["/api/loans", id || "1"] });
  });

  it("maps all header props and all 17 rows in exact column/DOM order", () => {
    render(<LoanSummaryPage />);
    expect(state.header.mock.calls[0][0]).toEqual({
      loanNumber: "TEST-42", cifNumber: "CIF-TEST", loanType: "Synthetic Construction",
      borrowerName: "Synthetic Alpha", amount: "$111.11",
      applicationType: "Joint Credit Application", ecoaDaysRemaining: 14, tridDaysRemaining: 3,
    });
    expect(screen.getAllByTestId(/^row-/).map(el => el.dataset.testid)).toEqual(rows.map(([id]) => `row-${id}`));
    for (const [id, label, value] of rows) {
      expect(screen.getByTestId(`label-${id}`).textContent).toBe(label);
      expect(screen.getByTestId(`text-${id}`).textContent).toBe(value);
    }
    expect(screen.getAllByTestId(/^column-/).map(el => el.dataset.testid)).toEqual([
      "column-ratios", "column-reserves", "column-amounts", "column-product",
    ]);
    expect(screen.getByTestId("column-ratios").parentElement).toHaveClass("grid-cols-1", "md:grid-cols-2", "xl:grid-cols-4");
    expect(screen.getByTestId("loan-content")).toHaveStyle({ paddingBottom: "60px" });
  });

  it.each([[null, "--"], [undefined, "--"], ["", ""], ["0", "0"], ["XX", "XX"]])("preserves Rule of XX %s", (value, expected) => {
    state.query.data = { ...loan, ruleOfXx: value };
    render(<LoanSummaryPage />);
    expect(screen.getByTestId("text-rule-of-xx").textContent).toBe(expected);
  });

  it.each([
    ["0", "$0.00"], ["-1234.5", "$-1,234.50"], ["1.239", "$1.24"],
    ["12tail", "$12.00"], ["", "$NaN"], ["invalid", "$NaN"],
  ])("preserves parseFloat currency semantics for %s in every monetary field", (input, expected) => {
    state.query.data = {
      ...loan, displayAmount: input, totalCv: input, cashReserves: input,
      totalLoanAmount: input, amountRequested: input, financedFees: input,
      taxesInsurance: input, cashToClose: input, principalInterest: input, totalMonthlyPayment: input,
    };
    render(<LoanSummaryPage />);
    expect(state.header.mock.calls[0][0].amount).toBe(expected);
    for (const id of ["total-cv", "cash-reserves", "total-loan-amount", "amount-requested", "financed-fees",
      "taxes-insurance", "cash-to-close", "principal-interest", "total-monthly-payment"])
      expect(screen.getByTestId(`text-${id}`).textContent).toBe(expected);
  });
});

describe("Borrower contacts and asynchronous clipboard", () => {
  it.each([[], [borrowers[0]], borrowers, borrowers.map(b => ({ ...b, isPrimary: true }))].map(list => [list]))(
    "preserves count/order/flags without primary sorting %#", list => {
      render(<BorrowerCards borrowers={list} />);
      expect(screen.getByTestId("text-borrower-heading")).toHaveTextContent("Borrower Contact Information");
      expect(screen.queryAllByTestId(/^card-borrower-/).map(el => el.dataset.testid)).toEqual(list.map(b => `card-borrower-${b.id}`));
      for (const b of list) {
        const card = within(screen.getByTestId(`card-borrower-${b.id}`));
        expect(card.getByTestId(`text-borrower-name-${b.id}`).textContent).toBe(b.name);
        expect(card.getByTestId(`link-email-${b.id}`)).toHaveAttribute("href", `mailto:${b.email}`);
        expect(card.getByTestId(`link-email-${b.id}`).textContent).toBe(b.email);
        expect(card.getByTestId(`text-phone-${b.id}`).textContent).toBe(b.phone);
        expect(card.getByTestId(`text-phone-${b.id}`).tagName).toBe("SPAN");
        expect(Boolean(card.queryByTestId(`badge-primary-borrower-${b.id}`))).toBe(b.isPrimary);
        expect(card.getByTestId(`button-copy-email-${b.id}`)).not.toHaveAccessibleName();
      }
    },
  );
  it.each(["resolve", "reject", "unavailable"])("reports clipboard %s", async mode => {
    const writeText = vi.fn(mode === "reject" ? () => Promise.reject(new Error("denied")) : () => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: mode === "unavailable" ? undefined : { writeText } });
    render(<BorrowerCards borrowers={borrowers} />);
    await act(async () => { fireEvent.click(screen.getByTestId("button-copy-email-first")); });
    if (mode !== "unavailable") expect(writeText).toHaveBeenCalledExactlyOnceWith("alpha@example.invalid");
    expect(state.toast).toHaveBeenCalledExactlyOnceWith(mode === "resolve"
      ? { title: "Email copied to clipboard" }
      : { title: "Failed to copy email", variant: "destructive" });
  });
  it("allows repeated in-flight copies and reports completion order, not activation order", async () => {
    let resolveFirst!: () => void;
    let rejectSecond!: (error: Error) => void;
    const writeText = vi.fn()
      .mockImplementationOnce(() => new Promise<void>(resolve => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectSecond = reject; }));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<BorrowerCards borrowers={borrowers} />);
    const button = screen.getByTestId("button-copy-email-second");
    fireEvent.click(button); fireEvent.click(button);
    expect(button).not.toBeDisabled();
    expect(writeText.mock.calls).toEqual([["beta@example.invalid"], ["beta@example.invalid"]]);
    expect(state.toast).not.toHaveBeenCalled();
    await act(async () => rejectSecond(new Error("denied")));
    await act(async () => resolveFirst());
    expect(state.toast.mock.calls).toEqual([
      [{ title: "Failed to copy email", variant: "destructive" }],
      [{ title: "Email copied to clipboard" }],
    ]);
  });
});
