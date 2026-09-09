import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChecklistPanel } from "../ChecklistPanel";
import { ChecklistProvider } from "@/contexts/checklist-context";

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
});