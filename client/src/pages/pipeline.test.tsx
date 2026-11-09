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
  const timestamp = screen.getByTestId("pipeline-row-first").querySelector("time");
  expect(timestamp).toHaveAttribute("title", new Date(loans[0].updatedAt).toLocaleString());
  fireEvent.click(screen.getByTestId("open-loan-first"));
  expect(history.at(-1)).toBe("/loans/first");
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
