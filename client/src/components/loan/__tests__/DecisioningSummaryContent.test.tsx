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
  it("enables the matching Deliver Decision Letter button after generation", () => {
    renderDecisioningFlow();

    const generate = screen.getByRole("button", { name: "Generate Decision Letter" });
    const view = screen.getByRole("button", { name: "View Decision Letter" });
    const deliver = screen.getByRole("button", { name: "Deliver Decision Letter" });

    expect(view.compareDocumentPosition(deliver) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(deliver).toHaveClass(...view.className.split(" "));
    for (const property of [
      "backgroundColor",
      "border",
      "borderRadius",
      "padding",
      "color",
    ] as const) {
      expect(deliver.style[property]).toBe(view.style[property]);
    }
    expect(deliver).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(generate);

    expect(view).toHaveAttribute("aria-disabled", "false");
    expect(deliver).toHaveAttribute("aria-disabled", "false");
  });

  it("records Decision Letter generation and delivery in the checklist and activity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 16, 32));
    renderDecisioningFlow();

    const generate = screen.getByRole("button", { name: "Generate Decision Letter" });
    const deliver = screen.getByRole("button", { name: "Deliver Decision Letter" });

    fireEvent.click(generate);
    fireEvent.click(generate);

    const decisionLetter = screen.getByTestId("checklist-task-decision-letter");
    expect(within(decisionLetter).getByText("1 of 2 Complete")).toBeInTheDocument();
    expect(within(decisionLetter).getByTestId("status-icon-in-progress")).toBeInTheDocument();

    expect(screen.getByText("Document Generated")).toBeInTheDocument();
    expect(screen.getByText("Decision letter generated")).toBeInTheDocument();
    expect(screen.getByText("September 10, 2026 at 4:32pm")).toBeInTheDocument();

    vi.setSystemTime(new Date(2026, 8, 10, 16, 40));
    fireEvent.click(deliver);
    fireEvent.click(deliver);

    expect(within(decisionLetter).getByText("2 of 2 Complete")).toBeInTheDocument();
    expect(within(decisionLetter).getByTestId("status-icon-complete")).toBeInTheDocument();
    fireEvent.click(within(decisionLetter).getByRole("button"));
    expect(within(decisionLetter).getAllByTestId("chip-complete")).toHaveLength(2);

    expect(screen.getByText("Document Delivered")).toBeInTheDocument();
    expect(screen.getByText("Decision letter delivered")).toBeInTheDocument();
    expect(screen.getByText("September 10, 2026 at 4:40pm")).toBeInTheDocument();

    const activityItems = within(screen.getByTestId("activity-list")).getAllByTestId(
      /^activity-item-/,
    );
    expect(activityItems).toHaveLength(6);
    expect(activityItems[0]).toHaveAttribute(
      "data-testid",
      "activity-item-decision-letter-delivered",
    );
    expect(activityItems[1]).toHaveAttribute(
      "data-testid",
      "activity-item-decision-letter-generated",
    );

    const loanEstimate = screen.getByTestId("checklist-task-loan-estimate");
    expect(within(loanEstimate).getByTestId("status-icon-in-progress")).toBeInTheDocument();
    fireEvent.click(within(loanEstimate).getByRole("button"));
    const estimateRows = within(loanEstimate).getAllByTestId(/^action-row-/);
    expect(within(estimateRows[0]).getByTestId("chip-in-progress")).toHaveTextContent(
      "In Progress",
    );
    expect(within(estimateRows[1]).getByTestId("status-icon-not-started")).toBeInTheDocument();
  });

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
});