import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentsContent } from "../DisclosureDocumentsContent";
import { ChecklistPanel } from "../ChecklistPanel";
import { LoanActivityPanel } from "../LoanActivityPanel";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { LoanActivityProvider, useActivityPanel } from "@/contexts/loan-activity-context";
import { useEffect } from "react";

function OpenActivityPanel() {
  const { toggleActivityPanel } = useActivityPanel();
  useEffect(() => {
    toggleActivityPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <LoanActivityPanel />;
}

function LoanEstimateRefireControls() {
  const { setActionStatus } = useChecklist();
  const { addActivity } = useActivityPanel();

  return (
    <button
      onClick={() => {
        setActionStatus("Loan Estimate", 0, "complete");
        setActionStatus("Loan Estimate", 1, "complete");
        addActivity({
          id: "loan-estimate-generated",
          title: "Document Generated",
          description: "Loan Estimate generated",
          timestamp: "September 10, 2026 at 4:32pm",
          date: new Date("2026-09-10T16:32:00"),
        });
        addActivity({
          id: "loan-estimate-delivered",
          title: "Document Delivered",
          description: "Loan Estimate delivered",
          timestamp: "September 10, 2026 at 4:40pm",
          date: new Date("2026-09-10T16:40:00"),
        });
      }}
    >
      Seed completed Loan Estimate
    </button>
  );
}

function RefireLoanEstimateButton() {
  const { refireCompletedTask } = useChecklist();
  return (
    <button
      onClick={() =>
        refireCompletedTask("Loan Estimate", ["re-fire", "not-started"])
      }
    >
      Re-fire Loan Estimate
    </button>
  );
}

function renderDocuments() {
  return render(
    <LoanActivityProvider>
      <ChecklistProvider>
        <DocumentsContent />
        <LoanEstimateRefireControls />
        <RefireLoanEstimateButton />
        <ChecklistPanel onClose={() => undefined} />
        <OpenActivityPanel />
      </ChecklistProvider>
    </LoanActivityProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DocumentsContent disclosure delivery actions", () => {
  it("places matching delivery buttons after the existing Download and View buttons", () => {
    renderDocuments();

    const download = screen.getByRole("button", { name: "Download At-App Disclosures" });
    const deliverAtApp = screen.getByRole("button", { name: "Deliver At-App Disclosures" });
    const view = screen.getByRole("button", { name: "View Loan Estimate" });
    const deliverEstimate = screen.getByRole("button", { name: "Deliver Loan Estimate" });

    expect(
      download.compareDocumentPosition(deliverAtApp) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      view.compareDocumentPosition(deliverEstimate) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(deliverAtApp.className).toBe(download.className);
    expect(deliverAtApp.style.cssText).toBe(download.style.cssText);
    expect(deliverEstimate.className).toBe(view.className);
    expect(deliverEstimate.style.cssText).toBe(view.style.cssText);
    expect(deliverAtApp).toHaveAttribute("aria-disabled", "true");
    expect(deliverEstimate).toHaveAttribute("aria-disabled", "true");
  });

  it.each([
    {
      prefix: "at-app-disclosures",
      generateLabel: "Generate At-App Disclosures",
      deliverLabel: "Deliver At-App Disclosures",
    },
    {
      prefix: "loan-estimate",
      generateLabel: "Generate Loan Estimate",
      deliverLabel: "Deliver Loan Estimate",
    },
  ])("records delivery after $generateLabel finishes", ({ prefix, generateLabel, deliverLabel }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T15:45:00"));
    renderDocuments();

    const generate = screen.getByRole("button", { name: generateLabel });
    const deliver = screen.getByRole("button", { name: deliverLabel });

    fireEvent.click(deliver);
    expect(screen.queryByTestId(`text-${prefix}-delivered`)).not.toBeInTheDocument();

    fireEvent.click(generate);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(deliver).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(deliver);
    expect(screen.getByTestId(`text-${prefix}-delivered`)).toHaveTextContent(
      "Marked Delivered: 09/09/2026 03:45 PM",
    );
  });

  it("synchronizes Loan Estimate generation and delivery without duplicates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 16, 32));
    renderDocuments();

    const generate = screen.getByRole("button", { name: "Generate Loan Estimate" });
    const deliver = screen.getByRole("button", { name: "Deliver Loan Estimate" });
    const loanEstimate = screen.getByTestId("checklist-task-loan-estimate");

    fireEvent.click(generate);
    expect(within(loanEstimate).getByText("0 of 2 Complete")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(within(loanEstimate).getByText("1 of 2 Complete")).toBeInTheDocument();
    expect(screen.getByText("Loan Estimate generated")).toBeInTheDocument();
    expect(screen.getByText("September 10, 2026 at 4:32pm")).toBeInTheDocument();

    fireEvent.click(generate);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getAllByText("Loan Estimate generated")).toHaveLength(1);

    vi.setSystemTime(new Date(2026, 8, 10, 16, 40));
    fireEvent.click(deliver);
    fireEvent.click(deliver);

    expect(within(loanEstimate).getByText("2 of 2 Complete")).toBeInTheDocument();
    expect(within(loanEstimate).getByTestId("status-icon-complete")).toBeInTheDocument();
    expect(screen.getByTestId("text-loan-estimate-delivered")).toHaveTextContent(
      "Marked Delivered: 09/10/2026 04:40 PM",
    );
    expect(screen.getByText("Loan Estimate delivered")).toBeInTheDocument();
    expect(screen.getByText("September 10, 2026 at 4:40pm")).toBeInTheDocument();
    expect(screen.getAllByText("Loan Estimate delivered")).toHaveLength(1);

    const activityItems = within(screen.getByTestId("activity-list")).getAllByTestId(
      /^activity-item-/,
    );
    expect(activityItems[0]).toHaveAttribute("data-testid", "activity-item-loan-estimate-delivered");
    expect(activityItems[1]).toHaveAttribute("data-testid", "activity-item-loan-estimate-generated");
  });

  it("preserves the original Loan Estimate history when a re-fired cycle completes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 14, 11, 5));
    renderDocuments();

    fireEvent.click(screen.getByRole("button", { name: "Seed completed Loan Estimate" }));
    fireEvent.click(screen.getByRole("button", { name: "Re-fire Loan Estimate" }));

    const loanEstimate = screen.getByTestId("checklist-task-loan-estimate");
    expect(within(loanEstimate).getByText("0 of 2 Complete")).toBeInTheDocument();
    expect(within(loanEstimate).getByTestId("status-icon-re-fire")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate Loan Estimate" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(within(loanEstimate).getByText("1 of 2 Complete")).toBeInTheDocument();
    expect(within(loanEstimate).getByTestId("status-icon-re-fire")).toBeInTheDocument();
    fireEvent.click(within(loanEstimate).getByRole("button"));
    const refiredRows = within(loanEstimate).getAllByTestId(/^action-row-/);
    expect(within(refiredRows[0]).getByTestId("chip-complete")).toBeInTheDocument();
    expect(within(refiredRows[1]).getByTestId("chip-re-fire")).toHaveTextContent("Re-fire");

    fireEvent.click(screen.getByRole("button", { name: "Deliver Loan Estimate" }));

    expect(within(loanEstimate).getByText("2 of 2 Complete")).toBeInTheDocument();
    expect(within(loanEstimate).getAllByTestId("status-icon-complete")).toHaveLength(3);
    expect(screen.getAllByText("Loan Estimate generated")).toHaveLength(2);
    expect(screen.getAllByText("Loan Estimate delivered")).toHaveLength(2);
    expect(
      screen.getByTestId("activity-item-loan-estimate-generated-refire-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("activity-item-loan-estimate-delivered-refire-1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("activity-item-loan-estimate-generated")).toBeInTheDocument();
    expect(screen.getByTestId("activity-item-loan-estimate-delivered")).toBeInTheDocument();
  });

  it("synchronizes Early Disclosures generation and delivery without duplicates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 14, 15));
    renderDocuments();

    const generate = screen.getByRole("button", { name: "Generate At-App Disclosures" });
    const deliver = screen.getByRole("button", { name: "Deliver At-App Disclosures" });
    const earlyDisclosures = screen.getByTestId("checklist-task-early-disclosures");

    fireEvent.click(generate);
    expect(within(earlyDisclosures).getByText("0 of 2 Complete")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(within(earlyDisclosures).getByText("1 of 2 Complete")).toBeInTheDocument();
    expect(screen.getByText("Early Disclosures generated")).toBeInTheDocument();
    expect(screen.getByText("September 10, 2026 at 2:15pm")).toBeInTheDocument();

    fireEvent.click(generate);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getAllByText("Early Disclosures generated")).toHaveLength(1);

    vi.setSystemTime(new Date(2026, 8, 10, 14, 25));
    fireEvent.click(deliver);
    fireEvent.click(deliver);

    expect(within(earlyDisclosures).getByText("2 of 2 Complete")).toBeInTheDocument();
    expect(within(earlyDisclosures).getByTestId("status-icon-complete")).toBeInTheDocument();
    expect(screen.getByTestId("text-at-app-disclosures-delivered")).toHaveTextContent(
      "Marked Delivered: 09/10/2026 02:25 PM",
    );
    expect(screen.getByText("Early Disclosures delivered")).toBeInTheDocument();
    expect(screen.getByText("September 10, 2026 at 2:25pm")).toBeInTheDocument();
    expect(screen.getAllByText("Early Disclosures delivered")).toHaveLength(1);

    const activityItems = within(screen.getByTestId("activity-list")).getAllByTestId(
      /^activity-item-/,
    );
    expect(activityItems[0]).toHaveAttribute("data-testid", "activity-item-early-disclosures-delivered");
    expect(activityItems[1]).toHaveAttribute("data-testid", "activity-item-early-disclosures-generated");
  });

  it("clears mounted document state and cancels pending generation on Reset Demo", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderDocuments();

    const generateEstimate = screen.getByRole("button", { name: "Generate Loan Estimate" });
    const deliverEstimate = screen.getByRole("button", { name: "Deliver Loan Estimate" });
    const generateDisclosures = screen.getByRole("button", {
      name: "Generate At-App Disclosures",
    });

    fireEvent.click(generateEstimate);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(deliverEstimate);
    expect(screen.getByTestId("text-loan-estimate-status")).toHaveTextContent("Last Generated:");
    expect(screen.getByTestId("text-loan-estimate-delivered")).toBeInTheDocument();

    fireEvent.click(generateDisclosures);
    expect(screen.getByTestId("text-at-app-disclosures-status")).toHaveTextContent(
      "Generating At-App Disclosures",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId("text-loan-estimate-status")).toHaveTextContent(
      "No Loan Estimates have been generated",
    );
    expect(screen.queryByTestId("text-loan-estimate-delivered")).not.toBeInTheDocument();
    expect(deliverEstimate).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("text-at-app-disclosures-status")).toHaveTextContent(
      "No At-App Disclosures have been generated",
    );
    expect(screen.getByTestId("checklist-task-loan-estimate")).toHaveTextContent(
      "0 of 2 Complete",
    );
    expect(screen.getByTestId("checklist-task-early-disclosures")).toHaveTextContent(
      "0 of 2 Complete",
    );
    expect(screen.queryByText("Loan Estimate generated")).not.toBeInTheDocument();
    expect(screen.queryByText("Loan Estimate delivered")).not.toBeInTheDocument();
    expect(screen.queryByText("Early Disclosures generated")).not.toBeInTheDocument();
  });
});