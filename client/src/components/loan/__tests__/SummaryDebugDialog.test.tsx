import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { SummaryDebugDialog } from "../SummaryDebugDialog";

vi.mock("@/contexts/loan-application-context", () => ({
  useApplicationStatus: () => ({ document: { loan: { id: "debug" }, borrowers: [], sections: {} } }),
}));
afterEach(cleanup);
it("shows current calculation blockers in a dismissible Debug modal", async () => {
  const close = vi.fn();
  render(<SummaryDebugDialog open onOpenChange={close} />);
  expect(screen.getByRole("dialog")).toHaveAccessibleName("Debug");
  expect(screen.getByTestId("summary-missing-inputs")).toHaveTextContent("APR fee classifications");
  expect(screen.getByTestId("summary-missing-inputs")).toHaveTextContent("enter and save the loan amount in Loan Details");
  expect(screen.getByTestId("summary-missing-inputs")).not.toHaveTextContent("amountRequested:");
  expect(screen.getByTestId("summary-missing-inputs")).toHaveTextContent("Rule of XX");
  await userEvent.setup().keyboard("{Escape}");
  expect(close).toHaveBeenCalledWith(false);
});
it("does not show blockers when closed", () => {
  render(<SummaryDebugDialog open={false} onOpenChange={() => {}} />);
  expect(screen.queryByRole("dialog")).toBeNull();
});
