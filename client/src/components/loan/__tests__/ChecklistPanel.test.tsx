import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChecklistPanel } from "../ChecklistPanel";
import { ActionTimeline } from "../ChecklistActionTimeline";
import { ChecklistAction, ChecklistProvider } from "@/contexts/checklist-context";

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

describe("ChecklistPanel", () => {
  it("renders only the approved Loan Checklist tasks", () => {
    render(
      <ChecklistProvider>
        <ChecklistPanel onClose={() => undefined} />
      </ChecklistProvider>,
    );

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
    render(
      <ChecklistProvider>
        <ChecklistPanel onClose={() => undefined} />
      </ChecklistProvider>,
    );

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
    render(
      <ChecklistProvider>
        <ChecklistPanel onClose={() => undefined} />
      </ChecklistProvider>,
    );

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
});