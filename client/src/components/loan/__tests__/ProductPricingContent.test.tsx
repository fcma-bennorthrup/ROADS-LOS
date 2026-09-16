import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductPricingContent } from "../ProductPricingContent";
import { ChecklistPanel } from "../ChecklistPanel";
import { LoanHeader } from "../LoanHeader";
import {
  ChecklistProvider,
  ChecklistStatus,
  useChecklist,
} from "@/contexts/checklist-context";
import {
  LoanActivityProvider,
  useActivityPanel,
} from "@/contexts/loan-activity-context";
import { Toaster } from "@/components/ui/toaster";

vi.mock("@/components/GitHubSyncPanel", () => ({
  GitHubSyncPanel: () => null,
}));

function WorkflowControls() {
  const { tasks, setActionStatus, completeAction } = useChecklist();
  const { activityItems, addActivity } = useActivityPanel();
  const loanEstimate = tasks.find((task) => task.name === "Loan Estimate");

  const seedLoanEstimate = (statuses: ChecklistStatus[]) => {
    statuses.forEach((status, index) => {
      setActionStatus("Loan Estimate", index, status);
    });
  };

  return (
    <>
      <button
        onClick={() => {
          seedLoanEstimate(["complete", "complete"]);
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
        Seed complete estimate
      </button>
      {(["not-started", "in-progress", "blocked", "re-fire"] as ChecklistStatus[]).map(
        (status) => (
          <button
            key={status}
            onClick={() => seedLoanEstimate([status, "not-started"])}
          >
            {`Seed ${status} estimate`}
          </button>
        ),
      )}
      <span data-testid="loan-estimate-state">
        {loanEstimate
          ? `${loanEstimate.status}:${loanEstimate.actions.map((action) => action.status).join(",")}`
          : ""}
      </span>
      <span data-testid="activity-state">
        {activityItems
          .map(
            (item) =>
              `${item.id}|${item.title}|${item.description}|${item.timestamp}|${item.date.toISOString()}`,
          )
          .join(";")}
      </span>
      <button onClick={() => completeAction("Loan Estimate", 0)}>
        Advance re-fired estimate
      </button>
      <button onClick={() => completeAction("Loan Estimate", 1)}>
        Finish re-fired estimate
      </button>
    </>
  );
}

function renderProductPricing() {
  return render(
    <LoanActivityProvider>
      <ChecklistProvider>
        <LoanHeader />
        <ProductPricingContent loanNumber="135792468" borrowerName="Morgan Rivera" />
        <WorkflowControls />
        <ChecklistPanel onClose={() => undefined} />
        <Toaster />
      </ChecklistProvider>
    </LoanActivityProvider>,
  );
}

function confirmRateLock() {
  fireEvent.click(screen.getByTestId("button-lock-rate"));
  fireEvent.click(screen.getByTestId("button-confirm-lock-rate"));
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ProductPricingContent rate lock workflow", () => {
  it("completes Rate Lock, records activity, and re-fires a completed Loan Estimate", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T13:27:00"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderProductPricing();

    expect(screen.queryByTestId("chip-trid-days")).not.toBeInTheDocument();
    expect(screen.getByTestId("chip-ecoa-days")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seed complete estimate" }));
    expect(screen.queryByTestId("chip-trid-days")).not.toBeInTheDocument();
    confirmRateLock();
    const rateLockToast = screen.getByTestId("toast-information");
    expect(within(rateLockToast).getByText("Rate Lock")).toBeInTheDocument();
    expect(
      within(rateLockToast).getByText("Rate locked for Loan 135792468 | Morgan Rivera"),
    ).toBeInTheDocument();

    const rateLock = screen.getByTestId("checklist-task-rate-lock");
    expect(rateLock).toHaveTextContent("1 of 3 Complete");
    fireEvent.click(within(rateLock).getByRole("button"));
    const rateLockRows = within(rateLock).getAllByTestId(/^action-row-/);
    expect(within(rateLockRows[0]).getByText("Initiate Rate Lock")).toBeInTheDocument();
    expect(within(rateLockRows[1]).getByText("Generate Rate Lock Letter")).toBeInTheDocument();
    expect(within(rateLockRows[2]).getByText("Deliver Rate Lock Letter")).toBeInTheDocument();
    expect(within(rateLockRows[0]).getByTestId("chip-complete")).toBeInTheDocument();
    expect(within(rateLockRows[1]).getByTestId("status-icon-not-started")).toBeInTheDocument();
    expect(within(rateLockRows[2]).getByTestId("status-icon-not-started")).toBeInTheDocument();

    const loanEstimate = screen.getByTestId("checklist-task-loan-estimate");
    expect(loanEstimate).toHaveTextContent("0 of 2 Complete");
    expect(within(loanEstimate).getByTestId("status-icon-re-fire")).toBeInTheDocument();
    fireEvent.click(within(loanEstimate).getByRole("button"));
    const estimateRows = within(loanEstimate).getAllByTestId(/^action-row-/);
    expect(within(estimateRows[0]).getByTestId("chip-re-fire")).toHaveTextContent("Re-fire");
    expect(within(estimateRows[1]).getByTestId("status-icon-not-started")).toBeInTheDocument();
    expect(screen.getByTestId("chip-trid-days")).toHaveTextContent("3 TRID Days Remaining");

    const activityState = screen.getByTestId("activity-state");
    expect(activityState).toHaveTextContent(
      "rate-lock|Rate Lock|Rate is locked|September 14, 2026 at 1:27pm|2026-09-14T13:27:00.000Z",
    );
    expect(activityState).toHaveTextContent("loan-estimate-generated");
    expect(activityState).toHaveTextContent("loan-estimate-delivered");

    confirmRateLock();
    expect(screen.getByTestId("toast-information")).toBe(rateLockToast);
    expect(screen.getByTestId("activity-state").textContent?.match(/rate-lock\|/g)).toHaveLength(1);
    expect(screen.getByTestId("loan-estimate-state")).toHaveTextContent(
      "re-fire:re-fire,not-started",
    );

    expect(screen.getByTestId("button-lock-rate")).toHaveTextContent("Update Rate Lock");
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));

    expect(screen.queryByTestId("toast-information")).not.toBeInTheDocument();
    expect(screen.getByTestId("checklist-task-rate-lock")).toHaveTextContent("0 of 3 Complete");
    expect(screen.getByTestId("checklist-task-loan-estimate")).toHaveTextContent("0 of 2 Complete");
    expect(screen.getByTestId("activity-state")).not.toHaveTextContent("rate-lock|");
    expect(screen.getByTestId("activity-state")).not.toHaveTextContent("loan-estimate-generated");
    expect(screen.getByTestId("button-lock-rate")).toHaveTextContent("Lock Rate");
    expect(screen.queryByTestId("icon-rate-locked")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chip-trid-days")).not.toBeInTheDocument();
    expect(screen.getByTestId("chip-ecoa-days")).toBeInTheDocument();
    expect(screen.getByTestId("button-edit-product")).not.toBeDisabled();
  });

  it.each(["not-started", "in-progress", "blocked", "re-fire"] as ChecklistStatus[])(
    "does not regress a %s Loan Estimate",
    (status) => {
      renderProductPricing();
      fireEvent.click(screen.getByRole("button", { name: `Seed ${status} estimate` }));

      confirmRateLock();

      expect(screen.getByTestId("loan-estimate-state")).toHaveTextContent(
        `${status}:${status},not-started`,
      );
      expect(screen.getByTestId("checklist-task-rate-lock")).toHaveTextContent("1 of 3 Complete");
      if (status === "re-fire") {
        expect(screen.getByTestId("chip-trid-days")).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId("chip-trid-days")).not.toBeInTheDocument();
      }
    },
  );

  it("persists the re-fired checklist and Rate Lock activity for the loan", () => {
    const firstRender = renderProductPricing();
    fireEvent.click(screen.getByRole("button", { name: "Seed complete estimate" }));
    confirmRateLock();
    firstRender.unmount();

    renderProductPricing();

    expect(screen.getByTestId("loan-estimate-state")).toHaveTextContent(
      "re-fire:re-fire,not-started",
    );
    expect(screen.getByTestId("checklist-task-rate-lock")).toHaveTextContent("1 of 3 Complete");
    expect(screen.getByTestId("activity-state")).toHaveTextContent(
      "rate-lock|Rate Lock|Rate is locked",
    );
    expect(screen.getByTestId("button-lock-rate")).toHaveTextContent("Update Rate Lock");
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();
    expect(screen.getByTestId("chip-trid-days")).toHaveTextContent("3 TRID Days Remaining");
  });

  it("keeps the TRID chip until every re-fired Loan Estimate action is complete", () => {
    renderProductPricing();
    fireEvent.click(screen.getByRole("button", { name: "Seed complete estimate" }));
    confirmRateLock();
    expect(screen.getByTestId("chip-trid-days")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Advance re-fired estimate" }));

    expect(screen.getByTestId("loan-estimate-state")).toHaveTextContent(
      "re-fire:complete,re-fire",
    );
    expect(screen.getByTestId("chip-trid-days")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Finish re-fired estimate" }));

    expect(screen.getByTestId("loan-estimate-state")).toHaveTextContent(
      "complete:complete,complete",
    );
    expect(screen.queryByTestId("chip-trid-days")).not.toBeInTheDocument();
  });
});