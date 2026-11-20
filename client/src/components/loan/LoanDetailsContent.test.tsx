import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { LoanDetailsContent } from "./LoanDetailsContent";

vi.mock("@/contexts/loan-application-context", () => ({
  useLoanDraft: (_key: string, initial: unknown) => {
    const [value, setValue] = useState(initial);
    return [value, setValue, vi.fn()];
  },
}));

describe("Requested Loan Amount currency display", () => {
  it("formats raw amounts and preserves edit, save, and discard behavior", () => {
    render(<LoanDetailsContent initialRequestedLoanAmount="123456.5" />);
    const field = screen.getByTestId("loan-detail-field-requested-loan-amount");
    expect(field).toHaveTextContent("$123,456.50");
    fireEvent.click(screen.getByTestId("button-edit-loan-details"));
    const input = screen.getByLabelText("Requested Loan Amount");
    // The currency prefix is a separate adornment, not part of the input value.
    expect(input).toHaveValue("123,456.50");
    fireEvent.focus(input);
    expect(input).toHaveValue("123456.5");
    fireEvent.change(input, { target: { value: "250000.75" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("250,000.75");
    fireEvent.click(screen.getByTestId("button-save-loan-details"));
    expect(field).toHaveTextContent("$250,000.75");
    fireEvent.click(screen.getByTestId("button-edit-loan-details"));
    fireEvent.change(screen.getByLabelText("Requested Loan Amount"), { target: { value: "99" } });
    fireEvent.click(screen.getByTestId("button-discard-loan-details"));
    expect(field).toHaveTextContent("$250,000.75");
  });

  it.each(["$123,456.50", "0", ""])("handles existing value %s", (value) => {
    render(<LoanDetailsContent initialRequestedLoanAmount={value} />);
    fireEvent.click(screen.getByTestId("button-edit-loan-details"));
    expect(screen.getByLabelText("Requested Loan Amount")).toHaveValue(
      value === "0" ? "0.00" : value.replace("$", ""),
    );
  });
});
