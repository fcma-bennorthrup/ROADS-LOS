import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollateralContent } from "../CollateralContent";
import { ChecklistPanel } from "../ChecklistPanel";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";

function renderCollateral() {
  return render(
    <LoanActivityProvider>
      <ChecklistProvider>
        <CollateralContent />
        <ChecklistPanel onClose={() => undefined} />
      </ChecklistProvider>
    </LoanActivityProvider>,
  );
}

function editAndSaveAddress(address = "100 Main Street") {
  fireEvent.click(screen.getByTestId("address-button-edit"));
  fireEvent.change(screen.getByTestId("input-address-1"), { target: { value: address } });
  fireEvent.click(screen.getByTestId("address-button-save"));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CollateralContent Subject Property workflow", () => {
  it("starts Title Work and Appraisal Evaluation when the edited address is saved", () => {
    renderCollateral();

    editAndSaveAddress();

    for (const testId of [
      "checklist-task-title-work",
      "checklist-task-appraisal-evaluation",
    ]) {
      const task = screen.getByTestId(testId);
      expect(within(task).getByTestId("status-icon-in-progress")).toBeInTheDocument();
      fireEvent.click(within(task).getByRole("button"));
      const rows = within(task).getAllByTestId(/^action-row-/);
      expect(within(rows[0]).getByTestId("chip-in-progress")).toHaveTextContent("In Progress");
      expect(within(rows[1]).getByTestId("status-icon-not-started")).toBeInTheDocument();
    }
  });

  it("does not regress collateral actions that already advanced", () => {
    renderCollateral();
    editAndSaveAddress();

    fireEvent.click(screen.getByRole("button", { name: "Order Title" }));
    fireEvent.click(screen.getByRole("button", { name: "Order Evaluation" }));
    editAndSaveAddress("200 Oak Avenue");

    for (const testId of [
      "checklist-task-title-work",
      "checklist-task-appraisal-evaluation",
    ]) {
      const task = screen.getByTestId(testId);
      expect(task).toHaveTextContent("1 of 3 Complete");
      if (within(task).queryByTestId("action-timeline") === null) {
        fireEvent.click(within(task).getByRole("button"));
      }
      const rows = within(task).getAllByTestId(/^action-row-/);
      expect(within(rows[0]).getByTestId("chip-complete")).toHaveTextContent("Complete");
      expect(within(rows[1]).getByTestId("chip-in-progress")).toHaveTextContent("In Progress");
    }
  });

  it("keeps the address and collateral tasks unchanged when Reset Demo is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderCollateral();
    editAndSaveAddress();

    fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));

    expect(screen.getByTestId("field-address-1")).toHaveTextContent("100 Main Street");
    expect(screen.getByTestId("checklist-task-title-work")).toHaveTextContent("0 of 3 Complete");
    expect(
      within(screen.getByTestId("checklist-task-title-work")).getByTestId(
        "status-icon-in-progress",
      ),
    ).toBeInTheDocument();
  });

  it("clears Subject Property and collateral task progress across remounts", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { unmount } = renderCollateral();
    editAndSaveAddress();

    fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));

    expect(screen.getByTestId("field-address-1")).not.toHaveTextContent("100 Main Street");
    expect(screen.queryByTestId("input-address-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("checklist-task-title-work")).toHaveTextContent("0 of 3 Complete");
    expect(screen.getByTestId("checklist-task-appraisal-evaluation")).toHaveTextContent(
      "0 of 3 Complete",
    );

    unmount();
    renderCollateral();

    fireEvent.click(screen.getByTestId("address-button-edit"));
    expect(screen.getByTestId("input-address-1")).toHaveValue("");
  });
});