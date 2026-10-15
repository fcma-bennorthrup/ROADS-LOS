import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoanHistoryPage from "@/pages/loan-history";
import { queryClient as productionClient } from "@/lib/queryClient";
import { loan } from "./fixtures";

const state = vi.hoisted(() => ({
  id: "synthetic-B" as string | undefined,
  activity: { activityPanelOpen: false, activityItems: [] as any[], closeActivityPanel: vi.fn() },
  header: vi.fn(),
}));
vi.mock("wouter", () => ({
  useParams: () => ({ id: state.id }),
  useLocation: () => ["/loans/synthetic-B/history", vi.fn()],
}));
// Only the shared header/admin boundary is replaced; the real History and
// Activity rendering remain mounted. No live App or sync hook is imported.
vi.mock("@/components/loan/LoanHeader", () => ({
  LoanHeader: (props: unknown) => { state.header(props); return <div data-testid="fixture-header" />; },
  BottomToolbar: () => <div data-testid="fixture-toolbar" />,
}));
vi.mock("@/contexts/loan-activity-context", () => ({ useActivityPanel: () => state.activity }));

let client: QueryClient;
let fetchMock: ReturnType<typeof vi.fn>;
const mount = () => render(<QueryClientProvider client={client}><LoanHistoryPage /></QueryClientProvider>);
beforeEach(() => {
  state.id = "synthetic-B";
  state.header.mockClear();
  state.activity.activityPanelOpen = false;
  state.activity.activityItems = [];
  client = new QueryClient({ defaultOptions: productionClient.getDefaultOptions() });
  fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(loan))));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers(); });

it("uses the exact key/request/options, waits, then renders the header and Change Log", async () => {
  let resolve!: (response: Response) => void;
  fetchMock.mockImplementation(() => new Promise<Response>(r => { resolve = r; }));
  mount();
  expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading loan details...");
  expect(screen.queryByTestId("fixture-header")).not.toBeInTheDocument();
  expect(screen.queryByTestId("history-content")).not.toBeInTheDocument();
  expect(screen.queryByTestId("fixture-toolbar")).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/loans/synthetic-B", { credentials: "include" });
  expect(client.getQueryCache().getAll().map(q => q.queryKey)).toEqual([["/api/loans", "synthetic-B"]]);
  expect(client.getDefaultOptions().queries).toMatchObject({
    staleTime: Infinity, retry: false, refetchOnWindowFocus: false, refetchInterval: false,
  });
  resolve(new Response(JSON.stringify(loan)));
  await screen.findByTestId("history-content");
  expect(state.header).toHaveBeenLastCalledWith({
    loanNumber: "TEST-002", cifNumber: "TEST-CIF", loanType: "Synthetic Loan",
    borrowerName: "Fixture Borrower", amount: "$1,234.50", applicationType: "Individual",
    ecoaDaysRemaining: 5, tridDaysRemaining: 3, activeTab: "History",
  });
});

it.each([
  ["404", 404, '{"message":"Missing fixture"}'],
  ["500", 500, '{"message":"Fixture failure"}'],
  ["HTML", 200, "<html>Not JSON</html>"],
  ["invalid JSON", 200, "{"],
  ["empty body", 200, ""],
  ["no data", 200, "null"],
  ["false data", 200, "false"],
])("keeps the same generic error and no success shell for %s", async (_, status, body) => {
  fetchMock.mockResolvedValue(new Response(body, { status }));
  mount();
  expect(await screen.findByTestId("error-state")).toHaveTextContent("Failed to load loan data");
  expect(screen.queryByTestId("fixture-header")).not.toBeInTheDocument();
  expect(screen.queryByTestId("fixture-toolbar")).not.toBeInTheDocument();
  expect(screen.queryByTestId("history-content")).not.toBeInTheDocument();
  expect(screen.queryByTestId("loan-activity-panel")).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("reuses successful cached data without fetching and defaults a missing id to 1", () => {
  state.id = undefined;
  client.setQueryData(["/api/loans", "1"], loan);
  mount();
  expect(screen.getByTestId("history-content")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(client.getQueryCache().getAll().map(q => q.queryKey)).toEqual([["/api/loans", "1"]]);
});

it("renders the error branch even if cached data remains after a failed refresh", async () => {
  client.setQueryData(["/api/loans", "synthetic-B"], loan);
  fetchMock.mockResolvedValue(new Response("Fixture refresh failed", { status: 500 }));
  mount();
  await client.refetchQueries({ queryKey: ["/api/loans", "synthetic-B"] });
  await screen.findByTestId("error-state");
  expect(client.getQueryData(["/api/loans", "synthetic-B"])).toEqual(loan);
  expect(screen.queryByTestId("history-content")).not.toBeInTheDocument();
});

it("uses a new query key when the route id changes", async () => {
  client.setQueryData(["/api/loans", "synthetic-B"], loan);
  const view = mount();
  state.id = "synthetic-C";
  view.rerender(<QueryClientProvider client={client}><LoanHistoryPage /></QueryClientProvider>);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/loans/synthetic-C", { credentials: "include" }));
  await screen.findByTestId("history-content");
  expect(client.getQueryCache().getAll().map(q => q.queryKey)).toEqual([
    ["/api/loans", "synthetic-B"], ["/api/loans", "synthetic-C"],
  ]);
});

it("keeps Activity items/filtering separate from Change Log rows and local controls", () => {
  client.setQueryData(["/api/loans", "synthetic-B"], loan);
  state.activity.activityPanelOpen = true;
  state.activity.activityItems = [{
    id: "activity-only", title: "Activity-only marker", description: "Synthetic activity",
    timestamp: "October 14, 2026 4:00pm", date: new Date("2026-10-14T16:00:00Z"),
  }];
  const view = mount();
  expect(screen.getByTestId("loan-activity-panel")).toHaveStyle({ width: "280px" });
  expect(screen.getByText("Activity-only marker")).toBeInTheDocument();
  fireEvent.change(screen.getByTestId("input-search-change-log"), { target: { value: "Field-40" } });
  expect(screen.getByText("Activity-only marker")).toBeInTheDocument();
  state.activity.activityItems = [];
  view.rerender(<QueryClientProvider client={client}><LoanHistoryPage /></QueryClientProvider>);
  expect(screen.getByTestId("change-log-row-40")).toBeInTheDocument();
  expect(screen.getByTestId("input-search-change-log")).toHaveValue("Field-40");
  expect(screen.queryByText("Activity-only marker")).not.toBeInTheDocument();
});
