import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChecklistPanel } from "../ChecklistPanel";
import { ChecklistProvider } from "@/contexts/checklist-context";

const REMAINING_TASKS = [
  "Eligibility & Scope",
  "TC/TN",
  "Loan Decision",
  "Decision Letter",
  "Loan Estimate",
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
});