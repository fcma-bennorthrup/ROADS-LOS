import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, expect, it, vi } from "vitest";
import PipelinePage from "./pipeline";
import { queryClient } from "@/lib/queryClient";
import { applicationStore } from "@/lib/loan-application-store";
import type { PipelineLoan } from "@shared/pipeline";
import { AppHeader } from "@/components/AppHeader";
import { MainNavigation } from "@/components/MainNavigation";
import { newLoanApplication } from "@shared/loan-factory";

vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: ({ loanActive }: { loanActive: boolean }) => <span data-testid="sync-scope">{String(loanActive)}</span> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); queryClient.clear(); });
const loans: PipelineLoan[] = [
  { id: "first", loanNumber: "123456790", primaryBorrowerName: "Avery Wright", loanType: "Purchase", stage: "Closing", amountRequested: 145000, product: "Fixed", mode: "blend", revision: 1, createdAt: "2026-11-09T12:00:00Z", updatedAt: "2026-11-09T12:00:00Z" },
  { id: "second", loanNumber: "123456791", primaryBorrowerName: "", loanType: "", stage: "Customer Application", amountRequested: null, product: null, mode: "empty", revision: 0, createdAt: "2026-11-09T11:00:00Z", updatedAt: "2026-11-09T11:00:00Z" },
];
function view() {
  const location = memoryLocation({ path: "/pipeline", record: true });
  const rendered = render(<QueryClientProvider client={queryClient}><Router hook={location.hook}><PipelinePage /></Router></QueryClientProvider>);
  return { ...location, ...rendered };
}
it("uses only the index projection, filters with counts, sorts, and links to loans", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(loans))));
  const install = vi.spyOn(applicationStore, "install");
  const { history } = view();
  await screen.findByTestId("pipeline-row-first");
  expect(fetch).toHaveBeenCalledWith("/api/loans", expect.objectContaining({ credentials: "include" }));
  expect(install).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Custom Filter" }));
  expect(screen.getByTestId("filter-stage-closing")).toHaveTextContent("Closing 1");
  fireEvent.click(screen.getByTestId("filter-stage-closing"));
  expect(screen.queryByTestId("pipeline-row-second")).toBeNull();
  fireEvent.click(screen.getByTestId("filter-stage-customer-application"));
  expect(screen.getByTestId("pipeline-row-second")).toBeInTheDocument();
  fireEvent.change(screen.getByTestId("input-pipeline-search"), { target: { value: "WRIGHT" } });
  expect(screen.queryByTestId("pipeline-row-second")).toBeNull();
  fireEvent.change(screen.getByTestId("input-pipeline-search"), { target: { value: "missing" } });
  expect(screen.getByTestId("pipeline-empty")).toHaveTextContent("No loans match");
  fireEvent.click(screen.getByTestId("clear-pipeline-filters"));
  fireEvent.click(screen.getByTestId("sort-loanNumber"));
  fireEvent.click(screen.getByTestId("sort-loanNumber"));
  expect(within(screen.getByTestId("pipeline-table")).getAllByRole("row")[1]).toHaveAttribute("data-loan", "second");
  const cells = within(screen.getByTestId("pipeline-row-first")).getAllByRole("cell");
  expect(cells[8]).toHaveTextContent("—");
  expect(cells[8].firstChild).toHaveAttribute("aria-label", "Application start date is not available in the saved pipeline data.");
  fireEvent.click(screen.getByTestId("open-loan-first"));
  expect(history.at(-1)).toBe("/loans/first");
});
it("renders the exact Figma columns and real queue counts without fabricating assignments", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(loans))));
  view();
  await screen.findByTestId("pipeline-row-first");
  expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
    "Loan Number", "CIF", "Region", "Borrower Name", "Loan Purpose", "Req Amount", "Stage", "LO", "App Start Date", "Decision", "Actions",
  ]);
  expect(screen.getByTestId("queue-all-loans")).toHaveTextContent("2 Loans");
  for (const department of ["sales-support", "operations", "credit", "quality-control"]) {
    expect(screen.getByTestId(`queue-${department}`)).toHaveTextContent("0 Loans");
    fireEvent.click(screen.getByTestId(`queue-${department}`));
    expect(screen.getByTestId("pipeline-empty")).toHaveTextContent("Department queue assignment has not been configured");
    expect(screen.queryByTestId("pipeline-row-first")).toBeNull();
  }
  fireEvent.click(screen.getByRole("button", { name: "View All Loans" }));
  expect(screen.getByTestId("pipeline-row-first")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Reports — unavailable/ })).toBeDisabled();
});
it("paginates real rows, resets the page on filtering and supports the table result search", async () => {
  const many = Array.from({ length: 23 }, (_, index) => ({ ...loans[0], id: `loan-${index}`, loanNumber: String(100000000 + index), primaryBorrowerName: `Borrower ${index}` }));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(many))));
  view();
  await screen.findByTestId("pipeline-row-loan-0");
  expect(screen.getAllByTestId(/^pipeline-row-/)).toHaveLength(20);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getAllByTestId(/^pipeline-row-/)).toHaveLength(3);
  expect(screen.getByRole("status")).toHaveTextContent("Page 2 of 2");
  fireEvent.change(screen.getByRole("searchbox", { name: "Filter table results" }), { target: { value: "Borrower 22" } });
  expect(screen.getAllByTestId(/^pipeline-row-/)).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent("Page 1 of 1");
});
it("preserves new loan and prototype admin entry points on Pipeline", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(loans))));
  view();
  await screen.findByTestId("pipeline-row-first");
  fireEvent.click(screen.getByTestId("button-new-loan"));
  expect(screen.getByTestId("source-blank")).toBeChecked();
  expect(screen.getByTestId("source-blend")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("cancel-new-loan"));
  fireEvent.click(screen.getByTestId("button-more-options"));
  expect(screen.getByTestId("menu-item-prototype-admin")).toBeInTheDocument();
  expect(screen.queryByTestId("menu-item-debug")).toBeNull();
});
it("shows only saved CIF and additional borrower fields", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ ...loans[0], cifNumber: "654123", additionalBorrowerCount: 2 }]))));
  view();
  const row = await screen.findByTestId("pipeline-row-first");
  expect(within(row).getByText("654123")).toBeInTheDocument();
  expect(within(row).getByLabelText("2 additional borrowers")).toHaveTextContent("+2");
  fireEvent.change(screen.getByTestId("input-pipeline-search"), { target: { value: "654123" } });
  expect(screen.getByTestId("pipeline-row-first")).toBeInTheDocument();
});
it("guards the loan workspace rail against leaving with unsaved edits", async () => {
  applicationStore.install(newLoanApplication({ id: "guard-rail", loanNumber: "123456799", source: "blank", borrowerCount: 1 }));
  applicationStore.markDraft("rail-guard", true);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const location = memoryLocation({ path: "/loans/guard-rail", record: true });
  render(<Router hook={location.hook}><MainNavigation loanActive /></Router>);
  await act(async () => { fireEvent.click(screen.getByTestId("main-nav-pipeline")); });
  expect(confirm).toHaveBeenCalled();
  expect(location.history.at(-1)).toBe("/loans/guard-rail");
  confirm.mockReturnValue(true);
  await act(async () => { fireEvent.click(screen.getByTestId("main-nav-pipeline")); });
  expect(location.history.at(-1)).toBe("/pipeline");
  applicationStore.markDraft("rail-guard", false);
});
it("provides skeleton, retry and true-empty states", async () => {
  let finish!: (response: Response) => void;
  const response = new Promise<Response>(resolve => { finish = resolve; });
  vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(response).mockResolvedValue(new Response("[]")));
  view();
  expect(screen.getAllByTestId(/pipeline-skeleton-/)).toHaveLength(6);
  await act(async () => { finish(new Response("Unavailable", { status: 503 })); });
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the pipeline");
  fireEvent.click(screen.getByTestId("button-retry-pipeline"));
  expect(await screen.findByTestId("pipeline-empty")).toHaveTextContent("No loans yet — create the first one");
});
it("app header exposes sync but never loan demo or Debug even with an old active document", async () => {
  const location = memoryLocation({ path: "/pipeline" });
  render(<QueryClientProvider client={queryClient}><Router hook={location.hook}><AppHeader /></Router></QueryClientProvider>);
  fireEvent.click(screen.getByTestId("button-more-options"));
  expect(screen.getByTestId("menu-item-prototype-admin")).toBeInTheDocument();
  expect(screen.queryByTestId("menu-item-debug")).toBeNull();
  expect(screen.getByTestId("sync-scope")).toHaveTextContent("false");
});
