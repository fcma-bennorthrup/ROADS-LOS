import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router } from "wouter";
import LoanOriginationPage from "@/pages/loan-origination";
import { Providers, change, choose, click } from "./helpers";

// Only the admin transport surface is replaced, never the forms/native/Radix controls.
vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));
const loan = {
  id: "synthetic-a", loanNumber: "TEST-001", cifNumber: "TEST-CIF", loanType: "Land",
  primaryBorrowerName: "Synthetic Borrower", displayAmount: "1234.5",
  amountRequested: "9876.5", applicationType: "Individual", ecoaDaysRemaining: 7,
  tridDaysRemaining: 3, borrowers: [],
};
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach(c => c.clear()); clients.length = 0; window.history.replaceState(null, "", "/"); vi.useRealTimers(); vi.restoreAllMocks(); });

function fixture(search = "", state: "success" | "pending" | "error" | "empty" = "success") {
  window.history.replaceState(null, "", `/loans/synthetic-a/origination${search}`);
  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const client = new QueryClient({ defaultOptions: { queries: {
    retry: false, staleTime: Infinity, refetchOnWindowFocus: false,
    queryFn: () => state === "pending" ? new Promise(() => {}) :
      state === "error" ? Promise.reject(new Error("Synthetic failure")) : Promise.resolve(null),
  } } });
  clients.push(client);
  if (state === "success") client.setQueryData(["/api/loans", "synthetic-a"], loan);
  render(<Router><QueryClientProvider client={client}>
    <Providers><Route path="/loans/:id/origination"><LoanOriginationPage /></Route></Providers>
  </QueryClientProvider></Router>);
  return { client, navigate };
}

describe("Real Origination route with inert query cache", () => {
  it.each([
    ["Borrower Information", "borrower-information"], ["Loan Details", "loan-details"],
    ["Collateral", "collateral"], ["Product & Pricing", "product-pricing"], ["Fees", "fees"],
  ])("accepts exact section %s and mounts only that section", (name, id) => {
    fixture(`?section=${encodeURIComponent(name)}`);
    expect(screen.getByTestId(`${id}-content`)).toBeInTheDocument();
    expect(document.querySelectorAll('[data-testid$="-content"]')).toHaveLength(1);
  });
  it.each(["", "?section=", "?section=fees", "?section=Unknown", "?section=Unknown&section=Fees"])(
    "keeps default for invalid/absent/first duplicate %s", search => {
      fixture(search);
      expect(screen.getByTestId("borrower-information-content")).toBeInTheDocument();
    });
  it("uses first duplicate, ignores invalid changes, sidebar leaves URL unchanged and valid changes override", () => {
    const { navigate, client } = fixture("?section=Fees&section=Collateral");
    expect(screen.getByTestId("fees-content")).toBeInTheDocument();
    click("nav-item-loan-details");
    expect(window.location.search).toBe("?section=Fees&section=Collateral");
    click("button-edit-loan-details");
    expect(screen.getByTestId("input-requested-loan-amount")).toHaveValue("$9,876.50");
    change("input-requested-loan-amount", "local");
    click("button-save-loan-details");
    act(() => navigate("/loans/synthetic-a/origination?section=invalid"));
    expect(screen.getByTestId("loan-details-content")).toBeInTheDocument();
    act(() => navigate("/loans/synthetic-a/origination?section=Fees"));
    expect(screen.getByTestId("fees-content")).toBeInTheDocument();
    click("nav-item-loan-details");
    expect(screen.getByTestId("loan-detail-field-requested-loan-amount")).toHaveTextContent("$9,876.50");
    expect(client.getQueryCache().getAll().map(q => q.queryKey)).toEqual([["/api/loans", "synthetic-a"]]);
    expect(client.getQueryState(["/api/loans", "synthetic-a"])?.fetchStatus).toBe("idle");
  });
  it.each(["pending", "error", "empty"] as const)("renders %s without normal shell", async state => {
    fixture("", state);
    const target = state === "pending" ? "loading-state" : "error-state";
    expect(await screen.findByTestId(target)).toHaveTextContent(
      state === "pending" ? "Loading loan details..." : "Failed to load loan data");
    expect(screen.queryByTestId("side-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("loan-origination-page")).not.toBeInTheDocument();
  });
  it("loses borrower saves and fee rows on actual sidebar unmount", () => {
    fixture();
    click("personal-button-edit"); change("input-first-name", "Synthetic edit"); click("personal-button-save");
    click("nav-item-fees");
    choose("select-fee-type", "Appraisal Fee"); click("button-add-fee");
    expect(screen.getAllByTestId(/^fee-row-/)).toHaveLength(1);
    click("button-save-fee-table");
    click("nav-item-borrower-information");
    expect(screen.getByTestId("field-first-name")).not.toHaveTextContent("Synthetic edit");
    expect(screen.getAllByTestId(/^tab-borrower-/)).toHaveLength(2);
    click("nav-item-fees");
    expect(screen.queryAllByTestId(/^fee-row-/)).toHaveLength(0);
  });
});
