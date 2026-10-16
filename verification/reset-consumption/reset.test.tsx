import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router } from "wouter";
import LoanOriginationPage from "@/pages/loan-origination";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { resetClosingDisclosureHistory } from "@/lib/closing-disclosure-history";
import { click, change } from "../origination/helpers";

vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.forEach(client => client.clear());
  clients.length = 0;
  window.history.replaceState(null, "", "/");
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function Probe() {
  const { tasks, demoResetVersion, resetDemoTasks, getActionStatus } = useChecklist();
  return <>
    <button onClick={() => resetDemoTasks(tasks.map(t => t.name))}>Reset fixture</button>
    <output data-testid="reset-version">{demoResetVersion}</output>
    <output data-testid="rate-status">{getActionStatus("Rate Lock", 0)}</output>
    <output data-testid="title-status">{getActionStatus("Title Work", 0)}</output>
  </>;
}
function fixture(section = "Fees") {
  window.history.replaceState(null, "", `/loans/synthetic-a/origination?section=${encodeURIComponent(section)}`);
  const client = new QueryClient({ defaultOptions: { queries: {
    retry: false, staleTime: Infinity, refetchOnWindowFocus: false,
    queryFn: () => { throw new Error("UNEXPECTED_QUERY"); },
  } } });
  clients.push(client);
  for (const id of ["synthetic-a", "synthetic-b"]) client.setQueryData(["/api/loans", id], {
    id, loanNumber: "TEST-001", cifNumber: "TEST-CIF", loanType: "Land",
    primaryBorrowerName: "Synthetic Borrower", displayAmount: "1234.50",
    amountRequested: "9876.50", applicationType: "Individual",
    ecoaDaysRemaining: 7, tridDaysRemaining: 3, borrowers: [],
  });
  return render(<StrictMode><Router><QueryClientProvider client={client}>
    <LoanActivityProvider><ChecklistProvider><Probe />
      <Route path="/loans/:id/origination"><LoanOriginationPage /></Route>
    </ChecklistProvider></LoanActivityProvider>
  </QueryClientProvider></Router></StrictMode>);
}
const reset = async () => {
  const before = Number(screen.getByTestId("reset-version").textContent);
  fireEvent.click(screen.getByText("Reset fixture"));
  await waitFor(() => expect(Number(screen.getByTestId("reset-version").textContent)).toBeGreaterThan(before));
};
const save = (address: string) => {
  click("address-button-edit"); change("input-address-1", address); click("address-button-save");
};
const lock = () => { click("button-lock-rate"); click("button-confirm-lock-rate"); };
const nav = (section: string) => click(`nav-item-${section}`);
const storedAddress = () => JSON.parse(localStorage.getItem("loan-subject-property:synthetic-a")!).address1;
const navigate = (id: string) => act(() => {
  window.history.pushState(null, "", `/loans/${id}/origination?section=Collateral`);
  window.dispatchEvent(new PopStateEvent("popstate"));
});

describe("Approved reset consumption through the real Origination route", () => {
  it.each([true, false])("preserves newer address via Fees with reset mounted=%s", async mounted => {
    fixture("Collateral"); save("Synthetic old");
    if (!mounted) nav("fees");
    await reset();
    nav("collateral");
    expect(storedAddress()).toBe("");
    save("Synthetic newer");
    nav("fees"); nav("collateral");
    expect(screen.getByTestId("field-address-1")).toHaveTextContent("Synthetic newer");
    expect(storedAddress()).toBe("Synthetic newer");
    expect(screen.getByTestId("title-status")).toHaveTextContent("in-progress");
    await reset();
    expect(storedAddress()).toBe("");
  });
  it.each([true, false])("preserves relock via Fees with reset mounted=%s", async mounted => {
    fixture("Product & Pricing"); lock();
    if (!mounted) nav("fees");
    await reset();
    nav("product-pricing"); lock();
    nav("fees"); nav("product-pricing");
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();
    expect(screen.getByTestId("button-edit-product")).toBeDisabled();
    expect(screen.getByTestId("button-lock-rate")).toHaveTextContent("Update Rate Lock");
    expect(screen.getByTestId("rate-status")).toHaveTextContent("complete");
    await reset();
    expect(screen.queryByTestId("icon-rate-locked")).not.toBeInTheDocument();
  });
  it("consumes independently when both sections were absent, and ignores disclosure-only resets", async () => {
    fixture();
    await reset();
    nav("collateral"); save("Synthetic new");
    nav("product-pricing"); lock();
    const version = screen.getByTestId("reset-version").textContent;
    await act(async () => { await resetClosingDisclosureHistory("synthetic-a", true); });
    expect(screen.getByTestId("reset-version")).toHaveTextContent(version!);
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();
    nav("collateral");
    expect(screen.getByTestId("field-address-1")).toHaveTextContent("Synthetic new");
  });
  it.each([false, true])("preserves reload lifetime with address consumed=%s", async consumed => {
    const view = fixture("Collateral"); save("Synthetic before");
    nav("fees"); await reset();
    if (consumed) { nav("collateral"); save("Synthetic after"); }
    view.unmount();
    fixture("Collateral");
    expect(screen.getByTestId("reset-version")).toHaveTextContent("0");
    expect(screen.getByTestId("field-address-1")).toHaveTextContent(consumed ? "Synthetic after" : "Synthetic before");
  });
  it("does not carry pending or consumed resets between loans", async () => {
    fixture("Collateral"); save("Synthetic A");
    nav("fees"); await reset();
    navigate("synthetic-b");
    expect(screen.getByTestId("reset-version")).toHaveTextContent("0");
    save("Synthetic B");
    navigate("synthetic-a");
    expect(screen.getByTestId("reset-version")).toHaveTextContent("0");
    expect(screen.getByTestId("field-address-1")).toHaveTextContent("Synthetic A");
    navigate("synthetic-b");
    expect(screen.getByTestId("field-address-1")).toHaveTextContent("Synthetic B");
  });
  it("retains cancelled Reset Demo behavior", async () => {
    fixture("Collateral"); save("Synthetic retain");
    await reset(); save("Synthetic after");
    const version = screen.getByTestId("reset-version").textContent;
    vi.spyOn(window, "confirm").mockReturnValue(false);
    click("toolbar-checklist");
    click("button-reset-demo");
    expect(screen.getByTestId("reset-version")).toHaveTextContent(version!);
    nav("fees"); nav("collateral");
    expect(screen.getByTestId("field-address-1")).toHaveTextContent("Synthetic after");
  });
  it("does not replay a consumed address reset when its storage write is denied", async () => {
    fixture("Collateral");
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(key, value) {
      if (key.startsWith("loan-subject-property:")) throw new Error("Synthetic denied");
      return set.call(this, key, value);
    });
    await reset();
    expect(screen.getByTestId("field-address-1")).not.toHaveTextContent("Address 2");
    vi.restoreAllMocks();
    save("Synthetic recovered");
    nav("fees"); nav("collateral");
    expect(screen.getByTestId("field-address-1")).toHaveTextContent("Synthetic recovered");
  });
  it("preserves failed broad reset behavior without consuming a nonexistent reset", () => {
    fixture("Product & Pricing"); lock();
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Synthetic denied"); });
    fireEvent.click(screen.getByText("Reset fixture"));
    expect(screen.getByTestId("reset-version")).toHaveTextContent("0");
    nav("fees"); nav("product-pricing");
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();
  });
  it("waits for asynchronous reset completion and preserves newer state after completion", async () => {
    fixture("Collateral"); save("Synthetic old");
    let release!: () => void;
    vi.stubGlobal("navigator", { locks: { request: (_key: string, write: () => void) =>
      new Promise<void>(resolve => { release = () => { write(); resolve(); }; }),
    } });
    fireEvent.click(screen.getByText("Reset fixture"));
    expect(screen.getByTestId("reset-version")).toHaveTextContent("0");
    expect(storedAddress()).toBe("Synthetic old");
    nav("fees");
    await act(async () => release());
    nav("collateral");
    expect(storedAddress()).toBe("");
    save("Synthetic after async");
    nav("fees"); nav("collateral");
    expect(storedAddress()).toBe("Synthetic after async");
  });
  it("does not broadcast or consume an asynchronously rejected reset", async () => {
    fixture("Product & Pricing"); lock();
    let reject!: (error: Error) => void;
    vi.stubGlobal("navigator", { locks: { request: () =>
      new Promise<void>((_resolve, fail) => { reject = fail; }),
    } });
    fireEvent.click(screen.getByText("Reset fixture"));
    await act(async () => reject(new Error("Synthetic lock failure")));
    expect(screen.getByTestId("reset-version")).toHaveTextContent("0");
    nav("fees"); nav("product-pricing");
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();
    expect(screen.getByTestId("rate-status")).toHaveTextContent("complete");
  });
  it("retains a post-reset relock across provider replacement without persisting reset consumption", async () => {
    const view = fixture("Product & Pricing");
    await reset(); lock();
    view.unmount();
    fixture("Product & Pricing");
    expect(screen.getByTestId("reset-version")).toHaveTextContent("0");
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();
    expect(screen.getByTestId("rate-status")).toHaveTextContent("complete");
  });
});
