import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChecklistPanel } from "../ChecklistPanel";
import { ActionTimeline } from "../ChecklistActionTimeline";
import { ChecklistAction, ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import {
  LoanActivityProvider,
  useActivityPanel,
} from "@/contexts/loan-activity-context";

const REMAINING_TASKS = [
  "Eligibility & Scope",
  "TC/TN",
  "Loan Decision",
  "Decision Letter",
  "Loan Estimate",
  "Early Disclosures",
  "Title Work",
  "Appraisal Evaluation",
  "Rate Lock",
  "Closing Disclosure",
  "Closing Package",
  "Wires",
  "Pre-Closing Review",
  "Post Closing Review",
  "Loan Certification",
];

const REMOVED_TASKS = [
  "HMDA",
  "Required Docs",
  "Fees",
  "Property Taxes",
  "PTF Conditions",
  "Closing Conditions",
  "Prelim CD",
  "Booking",
];

function DemoStateControls() {
  const { setActionStatus } = useChecklist();
  const { addActivity, activityItems } = useActivityPanel();

  return (
    <>
      <button
        onClick={() => {
          setActionStatus("Loan Decision", 0, "complete");
          setActionStatus("Decision Letter", 0, "complete");
          setActionStatus("Decision Letter", 1, "complete");
          setActionStatus("Loan Estimate", 0, "complete");
          setActionStatus("Loan Estimate", 1, "complete");
          setActionStatus("Early Disclosures", 0, "complete");
          setActionStatus("Early Disclosures", 1, "complete");
          setActionStatus("Title Work", 0, "complete");
          for (const id of [
            "loan-decision",
            "decision-letter-generated",
            "decision-letter-delivered",
            "loan-estimate-generated",
            "loan-estimate-delivered",
            "early-disclosures-generated",
            "early-disclosures-delivered",
            "unrelated-runtime-entry",
          ]) {
            addActivity({
              id,
              title: "Runtime activity",
              description: id,
              timestamp: "September 10, 2026 at 4:32pm",
              date: new Date("2026-09-10T16:32:00"),
            });
          }
        }}
      >
        Seed demo state
      </button>
      <span data-testid="activity-ids">{activityItems.map((item) => item.id).join(",")}</span>
    </>
  );
}

function renderChecklist(extra?: React.ReactNode) {
  return render(
    <LoanActivityProvider>
      <ChecklistProvider>
        {extra}
        <ChecklistPanel onClose={() => undefined} />
      </ChecklistProvider>
    </LoanActivityProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChecklistPanel", () => {
  it("renders only the approved Loan Checklist tasks", () => {
    renderChecklist();

    const panel = screen.getByTestId("checklist-panel");
    expect(within(panel).getByRole("heading", { name: "Loan Checklist" })).toBeInTheDocument();

    for (const taskName of REMAINING_TASKS) {
      expect(within(panel).getByText(taskName)).toBeInTheDocument();
    }

    for (const taskName of REMOVED_TASKS) {
      expect(within(panel).queryByText(taskName)).not.toBeInTheDocument();
    }
  });

  it("renders Early Disclosures in the requested order with two not-started actions", () => {
    renderChecklist();

    const loanEstimate = screen.getByTestId("checklist-task-loan-estimate");
    const earlyDisclosures = screen.getByTestId("checklist-task-early-disclosures");
    const titleWork = screen.getByTestId("checklist-task-title-work");

    expect(
      loanEstimate.compareDocumentPosition(earlyDisclosures) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      earlyDisclosures.compareDocumentPosition(titleWork) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(earlyDisclosures).getByText("0 of 2 Complete")).toBeInTheDocument();
    expect(within(earlyDisclosures).getByTestId("status-icon-not-started")).toBeInTheDocument();

    const viewTask = within(earlyDisclosures).getByText("View Task");
    fireEvent.click(viewTask);
    expect(within(earlyDisclosures).queryByTestId("action-timeline")).not.toBeInTheDocument();

    fireEvent.click(within(earlyDisclosures).getByRole("button"));
    expect(within(earlyDisclosures).getByText("Generate Early Disclosures")).toBeInTheDocument();
    expect(within(earlyDisclosures).getByText("Deliver Early Disclosures")).toBeInTheDocument();
  });

  it("renders the reset decision and estimate tasks with only not-started actions", () => {
    renderChecklist();

    for (const [testId, expectedCount] of [
      ["checklist-task-loan-decision", "0 of 1 Complete"],
      ["checklist-task-decision-letter", "0 of 2 Complete"],
      ["checklist-task-loan-estimate", "0 of 2 Complete"],
    ] as const) {
      const task = screen.getByTestId(testId);
      expect(within(task).getByText(expectedCount)).toBeInTheDocument();
      expect(within(task).getByTestId("status-icon-not-started")).toBeInTheDocument();
      fireEvent.click(within(task).getByRole("button"));
      expect(within(task).queryByTestId(/^chip-/)).not.toBeInTheDocument();
      expect(within(task).getAllByTestId("status-icon-not-started")).toHaveLength(
        Number(expectedCount.slice(5, 6)) + 1,
      );
    }
  });

  it("renders the Figma Blocked and Re-fire action variants", () => {
    const actions: ChecklistAction[] = [
      { label: "Action #1", description: "Resolve blocking issue", status: "blocked" },
      { label: "Action #2", description: "Send disclosures again", status: "re-fire" },
    ];

    render(<ActionTimeline actions={actions} />);

    const rows = screen.getAllByTestId(/^action-row-/);
    expect(within(rows[0]).getByTestId("status-icon-blocked")).toBeInTheDocument();
    expect(within(rows[0]).getByTestId("chip-blocked")).toHaveTextContent("Blocked");
    expect(within(rows[0]).getByTestId("action-tracker-blocked")).toBeInTheDocument();
    expect(within(rows[1]).getByTestId("status-icon-re-fire")).toBeInTheDocument();
    expect(within(rows[1]).getByTestId("chip-re-fire")).toHaveTextContent("Re-fire");
    expect(within(rows[1]).getByTestId("action-tracker-re-fire")).toBeInTheDocument();
  });

  it("cancels without changing checklist or activity state", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderChecklist(<DemoStateControls />);

    fireEvent.click(screen.getByRole("button", { name: "Seed demo state" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));

    expect(screen.getByTestId("checklist-task-loan-decision")).toHaveTextContent("1 of 1 Complete");
    expect(screen.getByTestId("activity-ids")).toHaveTextContent("loan-decision");
  });

  it("resets only the demo workflow tasks and removes only their runtime activities", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { unmount } = renderChecklist(<DemoStateControls />);

    fireEvent.click(screen.getByRole("button", { name: "Seed demo state" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));

    for (const [testId, expectedCount] of [
      ["checklist-task-loan-decision", "0 of 1 Complete"],
      ["checklist-task-decision-letter", "0 of 2 Complete"],
      ["checklist-task-loan-estimate", "0 of 2 Complete"],
      ["checklist-task-early-disclosures", "0 of 2 Complete"],
    ]) {
      expect(screen.getByTestId(testId)).toHaveTextContent(expectedCount);
    }
    expect(screen.getByTestId("checklist-task-title-work")).toHaveTextContent("1 of 3 Complete");
    expect(screen.getByTestId("activity-ids")).toHaveTextContent("unrelated-runtime-entry");
    expect(screen.getByTestId("activity-ids")).not.toHaveTextContent("loan-decision");
    expect(screen.getByTestId("activity-ids")).not.toHaveTextContent("decision-letter-generated");
    expect(screen.getByTestId("activity-ids")).not.toHaveTextContent("loan-estimate-generated");
    expect(screen.getByTestId("activity-ids")).not.toHaveTextContent("early-disclosures-generated");

    unmount();
    renderChecklist(<DemoStateControls />);

    expect(screen.getByTestId("checklist-task-loan-decision")).toHaveTextContent("0 of 1 Complete");
    expect(screen.getByTestId("activity-ids")).toHaveTextContent("unrelated-runtime-entry");
    expect(screen.getByTestId("activity-ids")).not.toHaveTextContent("loan-decision");

    fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));
    expect(screen.getByTestId("checklist-task-loan-decision")).toHaveTextContent("0 of 1 Complete");
  });
});