import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { DecisioningSummaryContent } from "../DecisioningSummaryContent";
import { ChecklistPanel } from "../ChecklistPanel";
import { LoanActivityPanel } from "../LoanActivityPanel";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider, useActivityPanel } from "@/contexts/loan-activity-context";

function OpenActivityPanel() {
  const { toggleActivityPanel } = useActivityPanel();
  useEffect(() => {
    toggleActivityPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <LoanActivityPanel />;
}

function renderDecisioningFlow() {
  return render(
    <LoanActivityProvider>
      <ChecklistProvider>
        <DecisioningSummaryContent />
        <ChecklistPanel onClose={() => undefined} />
        <OpenActivityPanel />
      </ChecklistProvider>
    </LoanActivityProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});


describe("DecisioningSummaryContent checklist and activity wiring", () => {
  it("moves Loan Decision to in progress after pulling credit", () => {
    renderDecisioningFlow();

    fireEvent.click(screen.getByRole("button", { name: "Pull Credit" }));

    const task = screen.getByTestId("checklist-task-loan-decision");
    expect(within(task).getByTestId("status-icon-in-progress")).toBeInTheDocument();
    fireEvent.click(within(task).getByRole("button"));
    expect(within(task).getByTestId("chip-in-progress")).toHaveTextContent("In Progress");
  });

  it("completes Loan Decision, starts Decision Letter, and records one timestamped activity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 16, 32));
    renderDecisioningFlow();

    const decisionButton = screen.getByRole("button", { name: "Decision Loan" });
    fireEvent.click(decisionButton);
    fireEvent.click(decisionButton);

    const loanDecision = screen.getByTestId("checklist-task-loan-decision");
    expect(within(loanDecision).getByText("1 of 1 Complete")).toBeInTheDocument();
    expect(within(loanDecision).getByTestId("status-icon-complete")).toBeInTheDocument();

    const decisionLetter = screen.getByTestId("checklist-task-decision-letter");
    expect(within(decisionLetter).getByTestId("status-icon-in-progress")).toBeInTheDocument();
    fireEvent.click(within(decisionLetter).getByRole("button"));
    const letterRows = within(decisionLetter).getAllByTestId(/^action-row-/);
    expect(within(letterRows[0]).getByTestId("chip-in-progress")).toHaveTextContent("In Progress");
    expect(within(letterRows[1]).getByTestId("status-icon-not-started")).toBeInTheDocument();

    expect(screen.getAllByText("Loan Decision")).toHaveLength(2);
    expect(screen.getByText("Loan is approved")).toBeInTheDocument();
    expect(screen.getByText("September 10, 2026 at 4:32pm")).toBeInTheDocument();
    const activityItems = within(screen.getByTestId("activity-list")).getAllByTestId(
      /^activity-item-/,
    );
    expect(activityItems).toHaveLength(5);
    expect(activityItems[0]).toHaveAttribute("data-testid", "activity-item-loan-decision");
  });

  it("completes Decision Letter action one, starts action two, and records one generated activity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 16, 45));
    renderDecisioningFlow();

    const generateButton = screen.getByRole("button", { name: "Generate Decision Letter" });
    fireEvent.click(generateButton);
    fireEvent.click(generateButton);

    const decisionLetter = screen.getByTestId("checklist-task-decision-letter");
    expect(within(decisionLetter).getByText("1 of 2 Complete")).toBeInTheDocument();
    expect(within(decisionLetter).getByTestId("status-icon-in-progress")).toBeInTheDocument();

    fireEvent.click(within(decisionLetter).getByRole("button"));
    const letterRows = within(decisionLetter).getAllByTestId(/^action-row-/);
    expect(within(letterRows[0]).getByTestId("chip-complete")).toHaveTextContent("Complete");
    expect(within(letterRows[1]).getByTestId("chip-in-progress")).toHaveTextContent("In Progress");

    expect(screen.getAllByText("Decision Letter")).toHaveLength(2);
    expect(screen.getByText("Decision Letter has been generated")).toBeInTheDocument();
    expect(screen.getByText("September 10, 2026 at 4:45pm")).toBeInTheDocument();
    const activityItems = within(screen.getByTestId("activity-list")).getAllByTestId(
      /^activity-item-/,
    );
    expect(activityItems).toHaveLength(5);
    expect(activityItems[0]).toHaveAttribute(
      "data-testid",
      "activity-item-decision-letter-generated",
    );
  });
});