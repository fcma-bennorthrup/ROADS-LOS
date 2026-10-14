import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import LoanDecisioningPage from "@/pages/loan-decisioning";
import { queryClient as productionClient } from "@/lib/queryClient";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";

// Only the unrelated admin surface is inert. Header, sidebar, toolbar,
// checklist, activity, both financial editors and query function remain real.
vi.mock("@/components/GitHubSyncPanel", () => ({
  GitHubSyncPanel: ({ open }: { open: boolean }) => {
    if (open) throw new Error("Decisioning fixture must not open admin operations");
    return null;
  },
}));

// Do not import App: global sync observers are outside this page fixture.
const loan = {
  id: "fixture-a", loanNumber: "FIXTURE-001", cifNumber: "FIXTURE-CIF",
  loanType: "Construction", primaryBorrowerName: "Synthetic Borrower",
  displayAmount: "1200.25tail", applicationType: "Joint Credit Application",
  ecoaDaysRemaining: 14, tridDaysRemaining: 3, borrowers: [],
};
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(c => c.clear());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount(response: () => Promise<Response> = async () => new Response(JSON.stringify(loan))) {
  const fetcher = vi.fn(response);
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({ defaultOptions: productionClient.getDefaultOptions() });
  clients.push(client);
  const location = memoryLocation({ path: "/loans/fixture-a/decisioning" });
  // Providers key from window pathname, whereas route params use Wouter.
  window.history.replaceState({}, "", "/loans/fixture-a/decisioning");
  const view = render(
    <Router hook={location.hook}>
      <QueryClientProvider client={client}>
        <LoanActivityProvider><ChecklistProvider>
          <Route path="/loans/:id/decisioning"><LoanDecisioningPage /></Route>
        </ChecklistProvider></LoanActivityProvider>
      </QueryClientProvider>
    </Router>,
  );
  return { ...view, client, fetcher };
}
const click = (id: string) => fireEvent.click(screen.getByTestId(id));
const financials = async () => {
  await screen.findByTestId("loan-decisioning-page");
  fireEvent.click(screen.getByRole("button", { name: "Borrower Financials", exact: true }));
};
const editIncome = (value: string) => {
  click("button-edit-income-0");
  fireEvent.change(screen.getByTestId("input-employer"), { target: { value } });
};

describe("real Decisioning page with fake transport and disposable providers", () => {
  it("uses the production query contract and drops financial saved state on sidebar remount", async () => {
    const { client, fetcher, unmount } = mount();
    await financials();
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("/api/loans/fixture-a", { credentials: "include" });
    expect(client.getQueryCache().getAll().map(q => q.queryKey)).toEqual([["/api/loans", "fixture-a"]]);
    expect(client.getDefaultOptions().queries).toMatchObject({
      staleTime: Infinity, retry: false, refetchInterval: false, refetchOnWindowFocus: false,
    });
    expect(screen.getByTestId("loan-header")).toHaveTextContent("$1,200.25");
    // Empty API borrowers do not remove the local seeded financial tabs.
    expect(within(screen.getByTestId("borrower-tabs")).getAllByRole("button")).toHaveLength(2);
    editIncome("Saved then remounted");
    click("button-save-income-0");
    const row = screen.getByTestId("balance-sheet-row-current-assets");
    fireEvent.click(within(row).getByTestId("button-edit-asset-0"));
    fireEvent.change(screen.getByTestId("input-financial-institution"), { target: { value: "Saved balance" } });
    fireEvent.click(within(row).getByTestId("button-save-asset-0"));
    fireEvent.click(screen.getByRole("button", { name: "Decisioning Summary", exact: true }));
    expect(screen.queryByTestId("borrower-financials-content")).not.toBeInTheDocument();
    await financials();
    expect(screen.getByTestId("text-income-source-title-0")).not.toHaveTextContent("Saved then remounted");
    expect(screen.getByTestId("balance-sheet-row-current-assets")).not.toHaveTextContent("Saved balance");
    expect(fetcher).toHaveBeenCalledTimes(1);
    unmount();
    mount();
    await screen.findByTestId("loan-decisioning-page");
    expect(screen.queryByTestId("borrower-financials-content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pull Credit" })).toBeInTheDocument();
  });

  it("preserves mounted saved values and independent drafts through confirmed and cancelled Reset Demo", async () => {
    mount();
    await financials();
    editIncome("Saved income"); click("button-save-income-0");
    click("button-add-income-source");
    fireEvent.change(within(screen.getByTestId("income-source-card-1")).getByTestId("input-employer"),
      { target: { value: "Still drafting" } });
    const row = screen.getByTestId("balance-sheet-row-current-assets");
    fireEvent.click(within(row).getByTestId("button-edit-asset-0"));
    fireEvent.change(screen.getByTestId("input-financial-institution"), { target: { value: "Balance draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Checklist", exact: true }));
    for (const confirmed of [false, true]) {
      vi.spyOn(window, "confirm").mockReturnValue(confirmed);
      fireEvent.click(screen.getByRole("button", { name: "Reset Demo" }));
      expect(screen.getByTestId("input-employer")).toHaveValue("Still drafting");
      expect(screen.getByTestId("input-financial-institution")).toHaveValue("Balance draft");
      expect(screen.getByTestId("text-income-source-title-0")).toHaveTextContent("Saved income");
    }
    expect(window.confirm).toHaveBeenCalled();
    click("button-save-income-1");
    fireEvent.click(within(row).getByTestId("button-save-asset-0"));
    expect(screen.getByTestId("text-income-source-title-1")).toHaveTextContent("Still drafting");
    expect(row).toHaveTextContent("Balance draft");
  });

  it("shows only loading while the fake loan request is unresolved", () => {
    const { fetcher } = mount(() => new Promise(() => {}));
    expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading loan details...");
    expect(screen.queryByTestId("loan-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("borrower-financials-content")).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["404", () => new Response("missing", { status: 404 })],
    ["500", () => new Response("failed", { status: 500 })],
    ["HTML", () => new Response("<html>not JSON</html>")],
    ["null", () => new Response("null")],
  ] as const)("keeps the generic %s failure shell with no retries", async (_name, response) => {
    const { fetcher, client } = mount(async () => response());
    expect(await screen.findByTestId("error-state")).toHaveTextContent("Failed to load loan data");
    expect(screen.queryByTestId("loan-header")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrower Financials" })).not.toBeInTheDocument();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
