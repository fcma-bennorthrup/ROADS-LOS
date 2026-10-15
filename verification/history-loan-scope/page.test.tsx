import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoanHistoryPage from "@/pages/loan-history";
import { queryClient } from "@/lib/queryClient";
import { loan } from "../history/fixtures";

const state = vi.hoisted(() => ({ id: "1", content: vi.fn() }));
vi.mock("wouter", () => ({ useParams: () => ({ id: state.id }) }));
vi.mock("@/components/loan/HistoryContent", () => ({
  HistoryContent: (props: unknown) => { state.content(props); return <div data-testid="content" />; },
}));
vi.mock("@/components/loan/LoanHeader", () => ({
  LoanHeader: () => <div data-testid="header" />, BottomToolbar: () => null,
}));
vi.mock("@/components/loan/LoanActivityPanel", () => ({ LoanActivityPanel: () => null }));
afterEach(() => { cleanup(); state.content.mockClear(); vi.useRealTimers(); });

it("passes the route ID and keeps separate query entries across loans", () => {
  const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
  client.setQueryData(["/api/loans", "1"], { ...loan, id: "1" });
  client.setQueryData(["/api/loans", "2"], { ...loan, id: "2" });
  const tree = () => <QueryClientProvider client={client}><LoanHistoryPage /></QueryClientProvider>;
  state.id = "1";
  const view = render(tree());
  expect(state.content).toHaveBeenLastCalledWith({ loanId: "1" });
  state.id = "2";
  view.rerender(tree());
  expect(state.content).toHaveBeenLastCalledWith({ loanId: "2" });
  expect(client.getQueryCache().getAll().map(q => q.queryKey)).toEqual([
    ["/api/loans", "1"], ["/api/loans", "2"],
  ]);
  client.clear();
});

it.each([404, 500])("keeps loading/error branches and hides content for status %s", async status => {
  const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
  const fetch = vi.fn(async () => new Response("{}", { status }));
  vi.stubGlobal("fetch", fetch);
  state.id = "2";
  render(<QueryClientProvider client={client}><LoanHistoryPage /></QueryClientProvider>);
  expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading loan details...");
  expect(await screen.findByTestId("error-state")).toHaveTextContent("Failed to load loan data");
  expect(screen.queryByTestId("header")).not.toBeInTheDocument();
  expect(state.content).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/loans/2", { credentials: "include" });
  client.clear();
});
