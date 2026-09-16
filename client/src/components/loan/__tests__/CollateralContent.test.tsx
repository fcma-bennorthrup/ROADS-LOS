import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollateralContent } from "../CollateralContent";
import { ChecklistPanel } from "../ChecklistPanel";
import { ChecklistProvider } from "@/contexts/checklist-context";
import {
  LoanActivityProvider,
  useActivityPanel,
} from "@/contexts/loan-activity-context";
import { Toaster } from "@/components/ui/toaster";

function ActivityState() {
  const { activityItems } = useActivityPanel();
  return (
    <div data-testid="activity-state">
      {activityItems.map((item) => (
        <div key={item.id} data-testid={`activity-state-${item.id}`}>
          {item.title}|{item.description}|{item.timestamp}|{item.date.toISOString()}
        </div>
      ))}
    </div>
  );
}

function renderCollateral() {
  return render(
    <LoanActivityProvider>
      <ChecklistProvider>
        <CollateralContent loanNumber="246813579" borrowerName="Jordan Lee" />
        <ChecklistPanel onClose={() => undefined} />
        <ActivityState />
        <Toaster />
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
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CollateralContent Subject Property workflow", () => {
  it("uses Reset Demo as the only reset control", () => {
    renderCollateral();

    expect(screen.queryByTestId("button-reset-checklist")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reset$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset Demo" })).toBeInTheDocument();
  });

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

  it("adds the six requested activities with the action click timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T14:35:00"));
    renderCollateral();

    for (const buttonName of [
      "Order Title",
      "Submit Title",
      "Review Title",
      "Order Evaluation",
      "Complete Evaluation",
      "Deliver Evaluation",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: buttonName }));
    }

    const expectedActivities = [
      ["title-work-requested", "Title Work Requested", "Title work requested"],
      ["title-work-submitted", "Title Work Submitted", "Title work submitted for review"],
      ["title-work-cleared", "Title Work Cleared", "Title work cleared"],
      [
        "appraisal-evaluation-ordered",
        "Appraisal Evaluation Ordered",
        "Appraisal evaluation ordered",
      ],
      [
        "appraisal-evaluation-complete",
        "Appraisal Evaluation Complete",
        "Appraisal evaluation complete",
      ],
      [
        "appraisal-evaluation-delivered",
        "Appraisal Evaluation Delivered",
        "Appraisal evaluation delivered to borrower",
      ],
    ];

    for (const [id, title, description] of expectedActivities) {
      const activity = screen.getByTestId(`activity-state-${id}`);
      expect(activity).toHaveTextContent(`${title}|${description}|September 14, 2026 at 2:35pm`);
      expect(activity).toHaveTextContent("2026-09-14T14:35:00.000Z");
    }

    const toast = screen.getByTestId("toast-information");
    expect(within(toast).getByText("Title Work")).toBeInTheDocument();
    expect(
      within(toast).getByText("Title Work cleared for Loan 246813579 | Jordan Lee"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("toast-information")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByTestId("toast-information")).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Order Title" }));
    expect(screen.getByTestId("activity-state-title-work-requested")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));

    expect(screen.getByTestId("field-address-1")).not.toHaveTextContent("100 Main Street");
    expect(screen.queryByTestId("input-address-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("checklist-task-title-work")).toHaveTextContent("0 of 3 Complete");
    expect(screen.getByTestId("checklist-task-appraisal-evaluation")).toHaveTextContent(
      "0 of 3 Complete",
    );
    expect(screen.queryByTestId("activity-state-title-work-requested")).not.toBeInTheDocument();

    unmount();
    renderCollateral();

    fireEvent.click(screen.getByTestId("address-button-edit"));
    expect(screen.getByTestId("input-address-1")).toHaveValue("");
    fireEvent.change(screen.getByTestId("input-address-1"), {
      target: { value: "300 Pine Street" },
    });
    fireEvent.click(screen.getByTestId("address-button-save"));
    fireEvent.click(screen.getByRole("button", { name: "Order Title" }));
    expect(screen.getByTestId("activity-state-title-work-requested")).toBeInTheDocument();
  });
});