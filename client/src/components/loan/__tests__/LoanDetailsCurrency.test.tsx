import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoanDetailsContent } from "../LoanDetailsContent";

describe("Requested loan amount currency field", () => {
  it("formats existing values and supports currency editing without duplicate symbols", () => {
    render(<LoanDetailsContent initialRequestedLoanAmount="$125,000" />);
    const field = screen.getByTestId("loan-detail-field-requested-loan-amount");
    expect(field).toHaveTextContent("$125,000.00");
    fireEvent.click(screen.getByTestId("button-edit-loan-details"));
    const input = screen.getByRole("textbox", { name: "Requested Loan Amount" });
    expect(input).toHaveAttribute("inputmode", "decimal");
    fireEvent.change(input, { target: { value: "$250000.5" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("250,000.50");
    expect(within(field).getAllByText("$")).toHaveLength(1);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("0.00");
  });
});
