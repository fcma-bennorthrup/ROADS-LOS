import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProductPricingContent } from "@/components/loan/ProductPricingContent";
import { RoadsDatePicker } from "@/components/loan/RoadsDatePicker";
import { Providers, change, click } from "../origination/helpers";

const baseline = process.env.DATE_BASELINE === "1";
const initial = "11/28/2026";
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
function mountLocked() {
  render(<Providers><ProductPricingContent loanNumber="TEST" borrowerName="Synthetic" /></Providers>);
  click("button-lock-rate");
  expect(screen.getByTestId("input-lock-date")).toBeDisabled();
  expect(screen.getByTestId("input-lock-date")).toHaveValue(initial);
  click("button-confirm-lock-rate");
  click("button-lock-rate");
}
const values = ["", "invalid date", "10/17/2026", "10/19/2026"];
for (const dismiss of ["cancel", "close", "escape", "outside"]) {
  it.each(values)(`${dismiss} then reopen: %j`, async value => {
    mountLocked();
    change("input-lock-date", value);
    if (dismiss === "cancel") click("button-cancel-lock");
    if (dismiss === "close") click("button-close-lock-modal");
    if (dismiss === "escape") fireEvent.keyDown(document, { key: "Escape" });
    if (dismiss === "outside") {
      // Radix installs its document pointer listener on the next timer tick.
      await new Promise(resolve => setTimeout(resolve, 10));
      fireEvent.pointerDown(document.body, { button: 0, ctrlKey: false });
    }
    await waitFor(() => expect(screen.queryByTestId("rate-lock-modal")).not.toBeInTheDocument());
    expect(screen.getByTestId("rate-status")).toHaveTextContent("complete");
    click("button-lock-rate");
    expect(screen.getByTestId("input-lock-date")).toHaveValue(baseline ? value : initial);
  });
}
it.each(values)("confirmation accepts %j without adding validation and later cancellation restores it", value => {
  mountLocked();
  change("input-lock-date", value);
  click("button-confirm-lock-rate");
  click("button-lock-rate");
  expect(screen.getByTestId("input-lock-date")).toHaveValue(value);
  change("input-lock-date", "unconfirmed");
  click("button-cancel-lock");
  click("button-lock-rate");
  expect(screen.getByTestId("input-lock-date")).toHaveValue(baseline ? "unconfirmed" : value);
});
it("calendar-only dismissal retains the draft and selection restores trigger focus", () => {
  mountLocked();
  change("input-lock-date", "10/19/2026");
  click("input-lock-date-calendar-btn");
  expect(screen.getByTestId("input-lock-date-calendar")).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByTestId("rate-lock-modal"));
  expect(screen.queryByTestId("input-lock-date-calendar")).not.toBeInTheDocument();
  expect(screen.getByTestId("input-lock-date")).toHaveValue("10/19/2026");
  click("input-lock-date-calendar-btn");
  expect(screen.getByRole("button", { name: /Saturday, October 17th, 2026/ })).toBeDisabled();
  const day = screen.getByRole("button", { name: /Tuesday, October 20th, 2026/ });
  fireEvent.click(day);
  expect(screen.getByTestId("input-lock-date")).toHaveValue("10/20/2026");
  expect(screen.getByTestId("input-lock-date-calendar-btn")).toHaveFocus();
  click("button-cancel-lock");
  click("button-lock-rate");
  expect(screen.getByTestId("input-lock-date")).toHaveValue(baseline ? "10/20/2026" : initial);
});
it("standalone picker Escape closes only its calendar, retains its value and restores icon focus", () => {
  const onChange = vi.fn();
  render(<RoadsDatePicker value="10/19/2026" onChange={onChange} testId="standalone" />);
  click("standalone-calendar-btn");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByTestId("standalone-calendar")).not.toBeInTheDocument();
  expect(screen.getByTestId("standalone")).toHaveValue("10/19/2026");
  expect(screen.getByTestId("standalone-calendar-btn")).toHaveFocus();
  expect(onChange).not.toHaveBeenCalled();
});
it("reset while open closes and restores the default disabled date", async () => {
  mountLocked();
  change("input-lock-date", "unconfirmed");
  fireEvent.click(screen.getByText("Reset fixture"));
  await waitFor(() => expect(screen.queryByTestId("rate-lock-modal")).not.toBeInTheDocument());
  click("button-lock-rate");
  expect(screen.getByTestId("input-lock-date")).toHaveValue(initial);
  expect(screen.getByTestId("input-lock-date")).toBeDisabled();
});
