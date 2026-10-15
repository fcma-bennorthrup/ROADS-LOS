import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Route, Router, Switch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import LoanClosingBookingPage from "@/pages/loan-closing-booking";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { LoanActivityProvider, useActivityPanel } from "@/contexts/loan-activity-context";
import { queryClient } from "@/lib/queryClient";
import { GitHubSyncContext, type GitHubSyncContextValue } from "@/contexts/github-sync-context";

const loan = { id: "fixture-a", loanNumber: "SYNTHETIC-A", cifNumber: "SYNTHETIC-CIF",
  loanType: "Fixture Loan", primaryBorrowerName: "Synthetic Borrower", displayAmount: "1234.56",
  applicationType: "Individual", ecoaDaysRemaining: 20, tridDaysRemaining: 3, borrowers: [] };
const clients: QueryClient[] = [];
function InertAdmin({ children }: { children: React.ReactNode }) {
  type Pull = GitHubSyncContextValue["pullMutation"];
  type Push = GitHubSyncContextValue["pushMutation"];
  const deny = async (): Promise<NonNullable<Pull["data"]>> => { throw new Error("Admin disabled in fixture"); };
  const pullMutation = useMutation<NonNullable<Pull["data"]>, Error, Parameters<Pull["mutate"]>[0]>({ mutationFn: deny });
  const pushMutation = useMutation<NonNullable<Push["data"]>, Error, Parameters<Push["mutate"]>[0]>({ mutationFn: deny });
  return <GitHubSyncContext.Provider value={{ pullMutation, pushMutation,
    hasPendingConflicts: false, openConflictDialog: () => { throw new Error("Admin disabled in fixture"); } }}>
    {children}
  </GitHubSyncContext.Provider>;
}
afterEach(() => {
  cleanup(); clients.forEach(c => c.clear()); clients.length = 0;
  vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals();
});

// A read-only probe distinguishes provider changes from component-local edits.
function Probe() {
  const checklist = useChecklist();
  const activity = useActivityPanel();
  return <output data-testid="provider-state">{JSON.stringify({
    tasks: checklist.tasks, activity: activity.activityItems, reset: checklist.demoResetVersion,
  })}</output>;
}

function mount(response: () => Promise<Response>, cached = false, initial = "/loans/fixture-a/closing-booking") {
  const transport = vi.fn((url: string, options: RequestInit) => {
    if (!/^\/api\/loans\/(fixture-a|fixture-b|1)$/.test(url) ||
        JSON.stringify(options) !== JSON.stringify({ credentials: "include" })) {
      throw new Error(`Unexpected transport ${url}`);
    }
    return response();
  });
  vi.stubGlobal("fetch", transport);
  const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
  clients.push(client);
  if (cached) client.setQueryData(["/api/loans", "fixture-a"], loan);
  const location = memoryLocation({ path: initial });
  // Header's independent pathname lookup is deliberately supplied, not mocked.
  window.history.replaceState({}, "", initial);
  const view = render(
    <Router hook={location.hook}>
      <QueryClientProvider client={client}>
        <InertAdmin>
        <LoanActivityProvider><ChecklistProvider>
          <Probe />
          <Switch>
            <Route path="/loans/:id/closing-booking" component={LoanClosingBookingPage} />
            <Route path="/missing-id" component={LoanClosingBookingPage} />
            <Route><div data-testid="other-route">Inert destination</div></Route>
          </Switch>
        </ChecklistProvider></LoanActivityProvider>
        </InertAdmin>
      </QueryClientProvider>
    </Router>,
  );
  const navigate = (path: string) => act(() => {
    window.history.replaceState({}, "", path);
    location.navigate(path);
  });
  return { ...view, client, transport, navigate };
}
const ok = async () => new Response(JSON.stringify(loan), { status: 200 });
const click = (id: string) => fireEvent.click(screen.getByTestId(id));
const ready = () => screen.findByTestId("loan-closing-booking-page");
const edit = (value: string) => {
  click("button-edit-closing-details");
  fireEvent.change(screen.getByTestId("input-closing-date"), { target: { value } });
};

it("shows deferred loading, exact query key/options, then synthetic header", async () => {
  let resolve!: (response: Response) => void;
  const view = mount(() => new Promise(r => { resolve = r; }));
  expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading loan details...");
  expect(screen.queryByTestId("loan-header")).not.toBeInTheDocument();
  await act(async () => { resolve(await ok()); });
  await ready();
  expect(view.transport).toHaveBeenCalledExactlyOnceWith("/api/loans/fixture-a", { credentials: "include" });
  expect(view.client.getQueryCache().find({ queryKey: ["/api/loans", "fixture-a"], exact: true })).toBeDefined();
  // The real, closed admin panel registers a disabled observer, never a request.
  expect(view.client.getQueryCache().find({ queryKey: ["/api/github/sync-status"] })?.isActive()).toBe(false);
  expect(view.client.getDefaultOptions().queries).toMatchObject({
    staleTime: Infinity, retry: false, refetchInterval: false, refetchOnWindowFocus: false,
  });
  expect(screen.getByTestId("text-loan-amount")).toHaveTextContent("$1,234.56");
  expect(screen.getByTestId("closing-content")).toBeInTheDocument();
});

it.each([
  ["404", () => Promise.resolve(new Response("missing", { status: 404 }))],
  ["500", () => Promise.resolve(new Response("failed", { status: 500 }))],
  ["HTML", () => Promise.resolve(new Response("<html>gateway</html>", { status: 200 }))],
  ["invalid JSON", () => Promise.resolve(new Response("{", { status: 200 }))],
  ["null", () => Promise.resolve(new Response("null", { status: 200 }))],
])("retains generic error and no shell for %s, without retry", async (_name, response) => {
  const view = mount(response);
  expect(await screen.findByTestId("error-state")).toHaveTextContent("Failed to load loan data");
  expect(screen.queryByTestId("loan-header")).not.toBeInTheDocument();
  expect(screen.queryByTestId("bottom-toolbar")).not.toBeInTheDocument();
  expect(view.transport).toHaveBeenCalledTimes(1);
});

it("error wins over cached data; missing route ID uses 1", async () => {
  const view = mount(async () => new Response("failed", { status: 500 }), true);
  await ready();
  expect(view.transport).not.toHaveBeenCalled();
  await act(async () => { await view.client.refetchQueries({ queryKey: ["/api/loans", "fixture-a"] }); });
  expect(await screen.findByTestId("error-state")).toHaveTextContent("Failed to load loan data");
  expect(view.client.getQueryData(["/api/loans", "fixture-a"])).toEqual(loan);
  view.unmount();
  const fallback = mount(ok, false, "/missing-id");
  await ready();
  expect(fallback.transport).toHaveBeenCalledExactlyOnceWith("/api/loans/1", { credentials: "include" });
});

it("sidebar remount loses saved and draft edits; top-tab exit and cached return start Closing", async () => {
  const view = mount(ok);
  await ready();
  edit("saved local");
  click("button-save-closing-details");
  click("nav-item-closing");
  expect(screen.getByTestId("input-closing-date")).toHaveValue("saved local");
  click("nav-item-booking");
  expect(window.location.pathname).toBe("/loans/fixture-a/closing-booking");
  click("nav-item-closing");
  expect(screen.getByTestId("input-closing-date")).toHaveValue("");
  edit("unsaved local");
  click("nav-item-booking");
  click("nav-item-closing");
  expect(screen.getByTestId("input-closing-date")).toHaveValue("");
  edit("saved before exit");
  click("button-save-closing-details");
  click("tab-summary");
  expect(screen.getByTestId("other-route")).toBeInTheDocument();
  view.navigate("/loans/fixture-a/closing-booking");
  await ready();
  expect(screen.getByTestId("input-closing-date")).toHaveValue("");
  expect(view.transport).toHaveBeenCalledTimes(1);
});

it("loan-keyed real providers recreate local state for another loan", async () => {
  const view = mount(ok);
  await ready();
  edit("loan A");
  click("button-save-closing-details");
  view.navigate("/loans/fixture-b/closing-booking");
  await ready();
  expect(screen.getByTestId("input-closing-date")).toHaveValue("");
  expect(view.transport).toHaveBeenLastCalledWith("/api/loans/fixture-b", { credentials: "include" });
  view.navigate("/loans/fixture-a/closing-booking");
  await ready();
  expect(screen.getByTestId("input-closing-date")).toHaveValue("");
  expect(view.transport).toHaveBeenCalledTimes(2);
});

it("real Reset Demo leaves mounted drafts and booking timer independent; owned actions don't change providers", async () => {
  const view = mount(ok, true);
  await ready();
  const originalProviderState = screen.getByTestId("provider-state").textContent;
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const removeItem = vi.spyOn(Storage.prototype, "removeItem");
  edit("still local");
  fireEvent.click(screen.getByRole("checkbox", { name: "Pre-closing review complete" }));
  click("button-save-closing-details");
  expect(screen.getByTestId("provider-state").textContent).toBe(originalProviderState);
  expect(setItem).not.toHaveBeenCalled();
  expect(removeItem).not.toHaveBeenCalled();
  click("button-edit-closing-details");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  click("toolbar-checklist");
  click("button-reset-demo");
  await waitFor(() => expect(screen.getByTestId("provider-state").textContent).not.toBe(originalProviderState));
  expect(screen.getByTestId("input-closing-date")).toHaveValue("still local");
  expect(screen.getByTestId("input-closing-date")).not.toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "Pre-closing review complete" })).toBeChecked();
  click("nav-item-booking");
  const beforeBooking = screen.getByTestId("provider-state").textContent;
  setItem.mockClear(); removeItem.mockClear();
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-14T16:00:00Z"));
  click("button-book-loan");
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByTestId("provider-state").textContent).toBe(beforeBooking);
  expect(setItem).not.toHaveBeenCalled();
  expect(removeItem).not.toHaveBeenCalled();
  click("button-reset-demo");
  const afterReset = screen.getByTestId("provider-state").textContent;
  setItem.mockClear(); removeItem.mockClear();
  act(() => { vi.advanceTimersByTime(3999); });
  expect(screen.queryByTestId("text-booking-confirmation")).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(1); });
  expect(screen.getByTestId("text-booking-confirmation")).toHaveTextContent("10/14/2026 04:00 PM");
  expect(screen.getByTestId("provider-state").textContent).toBe(afterReset);
  expect(setItem).not.toHaveBeenCalled();
  expect(removeItem).not.toHaveBeenCalled();
  expect(view.transport).not.toHaveBeenCalled();
  click("nav-item-closing");
  click("nav-item-booking");
  expect(screen.queryByTestId("text-booking-confirmation")).not.toBeInTheDocument();
  click("button-book-loan");
  act(() => { vi.advanceTimersByTime(1000); });
  click("nav-item-closing");
  act(() => { vi.advanceTimersByTime(5000); });
  click("nav-item-booking");
  expect(screen.queryByTestId("text-booking-status")).not.toBeInTheDocument();
  expect(screen.queryByTestId("text-booking-confirmation")).not.toBeInTheDocument();
});
