import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import App from "./App";
import { queryClient } from "@/lib/queryClient";
import { applicationStore } from "@/lib/loan-application-store";
import { newLoanApplication } from "@shared/loan-factory";
import { applicationView } from "@shared/loan-application";

vi.mock("@/hooks/use-github-sync", () => ({ useGitHubSync: () => ({
  pullMutation: {}, pushMutation: {}, openConflictDialog: () => {}, hasPendingConflicts: false,
  conflictDialogOpen: false, setConflictDialogOpen: () => {}, conflictsData: null,
}) }));
vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));
vi.mock("@/components/ConflictResolutionDialog", () => ({ ConflictResolutionDialog: () => null }));
afterEach(() => { cleanup(); queryClient.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("keeps all six detail routes working under the loan scope and returns to the projection-only pipeline", async () => {
  const one = newLoanApplication({ id: "1", loanNumber: "123456789", source: "blank", borrowerCount: 2 });
  one.sections["borrower-primary"] = { firstName: "Morgan", lastName: "Rivera" };
  one.sections["storage:loan-runtime-activity:1"] = JSON.stringify([{
    id: "one-event", title: "Loan-specific event", description: "Morgan activity only",
    timestamp: "November 9, 2026", date: "2026-11-09T12:00:00Z",
  }]);
  const two = newLoanApplication({ id: "opaque-second", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
  two.sections["borrower-primary"] = { firstName: "Casey", lastName: "West" };
  const index = [one, two].map(doc => ({ id: doc.loan.id, loanNumber: doc.loan.loanNumber,
    primaryBorrowerName: applicationView(doc).primaryBorrowerName, loanType: "", stage: doc.loan.stage,
    amountRequested: null, product: null, mode: doc.mode, revision: doc.revision,
    createdAt: doc.meta!.createdAt, updatedAt: doc.meta!.updatedAt,
  }));
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/loans") return new Response(JSON.stringify(index));
    if (url === "/api/loans/1/application") return new Response(JSON.stringify(one));
    if (url === "/api/loans/opaque-second/application") return new Response(JSON.stringify(two));
    throw new Error(`Unexpected request: ${url}`);
  }));
  const install = vi.spyOn(applicationStore, "install");
  const { hook, history } = memoryLocation({ path: "/", record: true });
  render(<Router hook={hook}><App /></Router>);
  await screen.findByTestId("pipeline-row-1");
  expect(history.at(-1)).toBe("/pipeline");
  expect(install).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("open-loan-1"));
  await screen.findByTestId("loan-summary-page");
  expect(screen.getByTestId("text-borrower-name")).toHaveTextContent("Morgan Rivera");
  fireEvent.click(screen.getByTestId("button-sidebar-toggle"));
  expect(screen.getByText("Morgan activity only")).toBeInTheDocument();
  expect(screen.queryByText(/Intent to Proceed has been provided by Richard/)).toBeNull();
  for (const [tab, page] of [
    ["origination", "origination"], ["decisioning", "decisioning"], ["closing-booking", "closing-booking"],
    ["documents", "documents"], ["history", "history"], ["summary", "summary"],
  ]) {
    fireEvent.click(screen.getByTestId(`tab-${tab}`));
    await screen.findByTestId(`loan-${page}-page`);
    expect(history.at(-1)).toBe(`/loans/1${page === "summary" ? "" : `/${page}`}`);
  }
  fireEvent.click(screen.getByTestId("breadcrumb-pipeline"));
  await screen.findByTestId("pipeline-row-opaque-second");
  fireEvent.click(screen.getByTestId("open-loan-opaque-second"));
  await screen.findByTestId("loan-summary-page");
  expect(screen.getByTestId("text-borrower-name")).toHaveTextContent("Casey West");
  fireEvent.click(screen.getByTestId("button-sidebar-toggle"));
  expect(screen.queryByText("Morgan activity only")).toBeNull();
  expect(screen.queryByText(/Intent to Proceed has been provided by Richard/)).toBeNull();
  expect(applicationStore.document?.loan.id).toBe("opaque-second");
  fireEvent.click(screen.getByTestId("breadcrumb-pipeline"));
  await screen.findByTestId("pipeline-row-1");
  fireEvent.click(screen.getByTestId("open-loan-1"));
  await waitFor(() => expect(screen.getByTestId("text-borrower-name")).toHaveTextContent("Morgan Rivera"));
  expect(applicationStore.document?.loan.id).toBe("1");
});
