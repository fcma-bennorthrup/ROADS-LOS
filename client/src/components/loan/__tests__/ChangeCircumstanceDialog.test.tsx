import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangeCircumstanceDialog } from "../ChangeCircumstanceDialog";

vi.mock("@/contexts/loan-application-context", () => ({ useLoanEditing: vi.fn() }));
afterEach(cleanup);
describe("Change of circumstance dialog", () => {
  it("requires both inputs and retains entered context when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network unavailable"));
    const onClose = vi.fn();
    render(<ChangeCircumstanceDialog onSave={onSave} onClose={onClose} />);
    expect(screen.getByTestId("button-save-change-circumstance")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Reason"));
    fireEvent.click(screen.getByRole("button", { name: "Not a valid change of circumstance" }));
    fireEvent.change(screen.getByLabelText("Context"), { target: { value: "  Internal correction  " } });
    fireEvent.click(screen.getByTestId("button-save-change-circumstance"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Network unavailable"));
    expect(onSave).toHaveBeenCalledWith("not-valid", "Internal correction");
    expect(screen.getByLabelText("Context")).toHaveValue("  Internal correction  ");
    expect(onClose).not.toHaveBeenCalled();
  });
  it("shows a saved record read-only with no save action", () => {
    const close = vi.fn();
    render(<ChangeCircumstanceDialog onClose={close} record={{
      id: "record", savedAt: "2026-11-11T12:00:00.000Z", reason: "consumer-request",
      context: "Customer requested a change.", changes: [],
    }} />);
    expect(screen.getByTestId("text-circumstance-reason")).toHaveTextContent("Revisions requested by the consumer");
    expect(screen.getByLabelText("Context")).toHaveAttribute("readonly");
    expect(screen.queryByTestId("button-save-change-circumstance")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to controls" }));
    expect(close).toHaveBeenCalledOnce();
  });
});
