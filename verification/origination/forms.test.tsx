import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BorrowerInformationContent } from "@/components/loan/BorrowerInformationContent";
import { LoanDetailsContent } from "@/components/loan/LoanDetailsContent";
import { FeesContent } from "@/components/loan/FeesContent";
import { change, choose, click } from "./helpers";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Borrower drafts, real native inputs and unchanged disabled questionnaires", () => {
  it("keeps every personal draft independent across tabs; saves/discards locally and resets on remount", () => {
    const view = render(<BorrowerInformationContent />);
    const fields = ["first-name", "last-name", "ssn", "phone", "email", "address", "city", "zip", "dependents", "dependents-ages"];
    const defaults: Record<string, string> = {};
    for (const borrower of ["richard", "jane"]) {
      click(`tab-borrower-${borrower}`);
      click("personal-button-edit");
      defaults[borrower] = (screen.getByTestId("input-first-name") as HTMLInputElement).value;
      fields.forEach(f => change(`input-${f}`, `${borrower}-${f}`));
      expect(screen.getByTestId("input-dob")).toHaveAttribute("type", "date");
      change("input-dob", "2000-02-29");
      choose("select-state", "NY");
      choose("select-marital-status", "single");
      choose("select-farm-involvement", "full_time");
      expect(screen.getByTestId("text-borrower-name")).not.toHaveTextContent(`${borrower}-first-name`);
      document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(el => expect(el).toBeDisabled());
    }
    for (const borrower of ["richard", "jane"]) {
      click(`tab-borrower-${borrower}`);
      fields.forEach(f => expect(screen.getByTestId(`input-${f}`)).toHaveValue(`${borrower}-${f}`));
      expect(screen.getByTestId("input-dob")).toHaveValue("2000-02-29");
      expect(screen.getByTestId("select-state")).toHaveTextContent("NY - New York");
      click("personal-button-save");
      click("personal-button-edit");
      fields.forEach(f => change(`input-${f}`, ""));
      change("input-dob", "");
      choose("select-state", "AL");
      choose("select-marital-status", "widowed");
      choose("select-farm-involvement", "none");
      click("personal-button-discard");
      click("personal-button-edit");
      fields.forEach(f => expect(screen.getByTestId(`input-${f}`)).toHaveValue(`${borrower}-${f}`));
      expect(screen.getByTestId("input-dob")).toHaveValue("2000-02-29");
      expect(screen.getByTestId("select-state")).toHaveTextContent("NY - New York");
      expect(screen.getByTestId("select-marital-status")).toHaveTextContent("Single");
      expect(screen.getByTestId("select-farm-involvement")).toHaveTextContent("Full Time Farmer");
      click("personal-button-save");
    }
    view.unmount();
    render(<BorrowerInformationContent />);
    click("personal-button-edit");
    expect(screen.getByTestId("input-first-name")).toHaveValue(defaults.richard);
    expect(localStorage.length).toBe(0);
  });
});

describe("Loan details strings and local snapshots", () => {
  it("preserves unvalidated strings, all selections/checks, discard and mount-only prop seeding", () => {
    const view = render(<LoanDetailsContent initialRequestedLoanAmount="$123.45" />);
    expect(screen.getByTestId("textarea-tell-the-story")).toBeDisabled();
    click("button-edit-loan-details");
    change("input-requested-loan-amount", "not money");
    change("input-down-payment-amount", "");
    change("textarea-tell-the-story", "Synthetic\nstory");
    choose("select-loan-type", "cash_out");
    choose("select-loan-purpose", "other");
    choose("select-down-payment-source", "");
    fireEvent.click(screen.getByRole("checkbox", { name: "Intent to Proceed" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "BRP Loan" }));
    click("button-save-loan-details");
    view.rerender(<LoanDetailsContent initialRequestedLoanAmount="$999.00" />);
    expect(screen.getByTestId("loan-detail-field-requested-loan-amount")).toHaveTextContent("not money");
    click("button-edit-loan-details");
    change("input-requested-loan-amount", "discard me");
    change("input-down-payment-amount", "123");
    change("textarea-tell-the-story", "");
    choose("select-loan-type", "refinance");
    choose("select-loan-purpose", "primary_dwelling");
    choose("select-down-payment-source", "gift");
    fireEvent.click(screen.getByRole("checkbox", { name: "BRP Loan" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Intent to Proceed" }));
    click("button-discard-loan-details");
    click("button-edit-loan-details");
    expect(screen.getByTestId("input-requested-loan-amount")).toHaveValue("not money");
    expect(screen.getByTestId("input-down-payment-amount")).toHaveValue("");
    expect(screen.getByTestId("textarea-tell-the-story")).toHaveValue("Synthetic\nstory");
    expect(screen.getByTestId("select-loan-type")).toHaveTextContent("Cash Out");
    expect(screen.getByTestId("select-loan-purpose")).toHaveTextContent("Other");
    expect(screen.getByRole("checkbox", { name: "BRP Loan" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Intent to Proceed" })).toBeChecked();
    view.unmount();
    render(<LoanDetailsContent initialRequestedLoanAmount="$999.00" />);
    expect(screen.getByTestId("loan-detail-field-requested-loan-amount")).toHaveTextContent("$999.00");
    expect(localStorage.length).toBe(0);
  });
});

describe("Fees no-ops and collision characterization (not repair)", () => {
  it("keeps Save inert, strings literal, empty amounts defaulted, and deletes colliding IDs together", () => {
    const view = render(<FeesContent />);
    click("button-add-fee");
    expect(screen.queryAllByTestId(/^fee-row-/)).toHaveLength(0);
    choose("select-fee-type", "Appraisal Fee");
    change("input-le-amount", "abc");
    click("button-add-fee");
    choose("select-fee-type", "Appraisal Fee");
    click("button-add-fee");
    expect(screen.getAllByTestId(/^fee-row-/)).toHaveLength(2);
    expect(screen.getAllByTestId(/^fee-row-/)[0]).toHaveTextContent("$abc$0.00CashBuyer");
    change("input-cd-amount", "draft");
    const before = screen.getByTestId("fees-content").innerHTML;
    click("button-save-fee-table");
    expect(screen.getByTestId("fees-content").innerHTML).toBe(before);
    fireEvent.click(screen.getAllByTestId(/^button-delete-fee-/)[0]);
    expect(screen.queryAllByTestId(/^fee-row-/)).toHaveLength(0);
    expect(screen.getByTestId("input-cd-amount")).toHaveValue("draft");
    choose("select-fee-type", "Credit Report Fee");
    click("button-add-fee");
    choose("select-fee-type", "Title Search Fee");
    change("input-le-amount", "keep");
    click("button-delete-all-fees");
    expect(screen.getByTestId("select-fee-type")).toHaveTextContent("Title Search Fee");
    expect(screen.getByTestId("input-le-amount")).toHaveValue("keep");
    view.unmount();
    render(<FeesContent />);
    expect(screen.queryAllByTestId(/^fee-row-/)).toHaveLength(0);
    expect(screen.getByTestId("input-le-amount")).toHaveValue("");
    expect(localStorage.length).toBe(0);
  });
});
