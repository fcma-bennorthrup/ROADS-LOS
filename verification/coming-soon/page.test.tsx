import React from "react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import Page from "../../client/src/pages/loan-coming-soon";
import { queryClient } from "../../client/src/lib/queryClient";
import { ChecklistProvider, useChecklist } from "../../client/src/contexts/checklist-context";
import { LoanActivityProvider, useActivityPanel } from "../../client/src/contexts/loan-activity-context";
import { closingPackageStorageKey } from "../../client/src/lib/closing-package-progress";
import { closingDisclosureStorageKey } from "../../client/src/lib/closing-disclosure-history";

// Keep actual header/toolbar/panels/providers. Only the external sync surface is inert.
vi.mock("../../client/src/components/GitHubSyncPanel", () => ({
  GitHubSyncPanel: () => null,
}));

const loan = (id = "fixture-a", displayAmount = "1234.5") => ({
  id, loanNumber: `TEST-${id}`, cifNumber: "TEST-CIF", loanType: "Synthetic Type",
  primaryBorrowerName: "Synthetic Borrower", displayAmount,
  applicationType: "Synthetic Application", ecoaDaysRemaining: 9, tridDaysRemaining: 2,
  stage: "Booking", borrowers: [{ name: "Ignored Synthetic Borrower" }],
});
let clients: QueryClient[] = [];
let requests: Array<[string, unknown]> = [];
let activity: ReturnType<typeof useActivityPanel>;
let checklist: ReturnType<typeof useChecklist>;
function Probe() {
  activity = useActivityPanel();
  checklist = useChecklist();
  return null;
}
function mount(title = "Summary", path = "/loans/fixture-a", cached?: unknown) {
  const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
  clients.push(client);
  const location = memoryLocation({ path, record: true });
  window.history.replaceState(null, "", path);
  const id = path.match(/\/loans\/([^/]+)/)?.[1] || "1";
  if (cached !== undefined) client.setQueryData(["/api/loans", id], cached);
  const tree = (tab: string) => (
    <QueryClientProvider client={client}>
      <Router hook={location.hook}>
        <LoanActivityProvider><ChecklistProvider><Probe />
          {path === "/missing" ? <Page tabName={tab} /> :
            <Route path="/loans/:id"><Page tabName={tab} /></Route>}
        </ChecklistProvider></LoanActivityProvider>
      </Router>
    </QueryClientProvider>
  );
  const view = render(tree(title));
  return { ...view, client, location, update: (tab: string) => view.rerender(tree(tab)) };
}
function transport(response: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn((url, init) => {
    requests.push([String(url), init]);
    if (!/^\/api\/loans\/(fixture-a|fixture-b|1)$/.test(String(url)))
      throw new Error("UNEXPECTED_FIXTURE_TRANSPORT");
    return response();
  }));
}
beforeEach(() => {
  requests = [];
  transport(async () => new Response(JSON.stringify(loan())));
});
afterEach(() => {
  cleanup();
  clients.forEach(client => client.clear());
  clients = [];
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("retained Coming Soon query contract", () => {
  it("keeps production route table absent without importing App", () => {
    const app = readFileSync("client/src/App.tsx", "utf8");
    expect(app).not.toMatch(/LoanComingSoon|loan-coming-soon/);
    expect([...app.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1])).toEqual([
      "/", "/loans/:id/origination", "/loans/:id/decisioning",
      "/loans/:id/closing-booking", "/loans/:id/documents", "/loans/:id/history", "/loans/:id",
    ]);
    expect(app).toContain("<Route component={NotFound} />");
  });
  it("uses the actual defaults and pending then successful shell with 36px reserve", async () => {
    let resolve!: (r: Response) => void;
    transport(() => new Promise(r => { resolve = r; }));
    const { client } = mount();
    expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading loan details...");
    expect(screen.queryByTestId("loan-header")).toBeNull();
    expect(screen.queryByTestId("bottom-toolbar")).toBeNull();
    expect(client.getDefaultOptions().queries).toMatchObject({
      staleTime: Infinity, retry: false, refetchOnWindowFocus: false, refetchInterval: false,
    });
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
    await act(async () => resolve(new Response(JSON.stringify(loan()))));
    const root = await screen.findByTestId("loan-summary-page");
    expect([...root.children].map(e => e.getAttribute("data-testid"))).toEqual(["loan-header", null, null]);
    expect(root.children[1]).toHaveStyle({ paddingBottom: "36px" });
    expect(root).toHaveClass("h-screen", "overflow-hidden");
    expect(root.lastElementChild).toHaveClass("fixed", "bottom-0", "left-0", "w-full", "z-10");
    expect(requests).toEqual([["/api/loans/fixture-a", { credentials: "include" }]]);
    expect(client.getQueryCache().findAll().map(q => q.queryKey)).toEqual([["/api/loans", "fixture-a"]]);
    expect(screen.getByTestId("text-borrower-name")).toHaveTextContent("Synthetic Borrower");
    expect(screen.queryByText("Ignored Synthetic Borrower")).toBeNull();
    expect(screen.getByTestId("text-loan-metadata")).toHaveTextContent("TEST-CIF");
    expect(screen.getByTestId("text-loan-amount")).toHaveTextContent("$1,234.50");
    expect(screen.getByTestId("chip-ecoa-days")).toHaveTextContent("9");
    expect(screen.queryByTestId("chip-trid-days")).toBeNull();
  });
  it.each(["404", "500", "network", "invalid-json", "null", "false", "0", '""'])(
    "collapses %s into generic error without header or toolbar", async mode => {
      transport(async () => {
        if (mode === "network") throw new Error("PRIVATE_FIXTURE_ERROR");
        if (mode === "404" || mode === "500") return new Response("PRIVATE_FIXTURE_ERROR", { status: +mode });
        return new Response(mode === "invalid-json" ? "<html>not JSON</html>" : mode);
      });
      mount();
      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(await screen.findByTestId("error-state")).toHaveTextContent(/^Failed to load loan data$/);
      expect(screen.queryByTestId("loan-header")).toBeNull();
      expect(screen.queryByTestId("bottom-toolbar")).toBeNull();
      expect(requests).toHaveLength(1);
    },
  );
  it("uses fresh cache without fetching, then errors even with retained data", async () => {
    const { client } = mount("Summary", "/loans/fixture-a", loan());
    expect(screen.queryByTestId("loading-state")).toBeNull();
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(requests).toHaveLength(0);
    transport(async () => new Response("failed", { status: 500 }));
    await act(async () => { await client.refetchQueries({ queryKey: ["/api/loans", "fixture-a"] }); });
    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    expect(client.getQueryData(["/api/loans", "fixture-a"])).toEqual(loan());
    expect(requests).toHaveLength(1);
  });
  it("changes query key for two IDs without remounting the fixture", async () => {
    transport(async () => new Response(JSON.stringify(loan(requests.at(-1)![0].split("/").at(-1)))));
    const { location, client } = mount();
    await screen.findByText("Coming Soon");
    act(() => location.navigate("/loans/fixture-b"));
    await waitFor(() => expect(screen.getByTestId("breadcrumb-loan")).toHaveTextContent("TEST-fixture-b"));
    expect(requests.map(r => r[0])).toEqual(["/api/loans/fixture-a", "/api/loans/fixture-b"]);
    expect(client.getQueryCache().findAll().map(q => q.queryKey)).toEqual([
      ["/api/loans", "fixture-a"], ["/api/loans", "fixture-b"],
    ]);
  });
  it("defaults missing params to loan 1", async () => {
    mount("Summary", "/missing");
    await screen.findByText("Coming Soon");
    expect(requests).toEqual([["/api/loans/1", { credentials: "include" }]]);
  });
});

describe("text, formatting and retained local state", () => {
  it.each([
    ["Summary", "summary"], ["Unmapped", "unmapped"], ["", ""],
    ["Closing & Booking", "closing-booking"], ["A&B", "a&b"],
    [" A & B ", "-a-b-"], ["Long ".repeat(60), "long-".repeat(60)],
  ])("retains title %j exactly", (title, slug) => {
    mount(title, "/loans/fixture-a", loan());
    expect(screen.getByTestId(`loan-${slug}-page`).querySelector("h2")?.textContent).toBe(title);
    expect(screen.getByText("Coming Soon").className).toBe("body-100");
  });
  it.each([
    ["0", "$0.00"], ["-12.5", "$-12.50"], ["1.239", "$1.24"], ["", "$NaN"],
    ["bad", "$NaN"], ["12suffix", "$12.00"], ["1,200", "$1.00"],
  ])("preserves amount %j as %s", (input, output) => {
    mount("Summary", "/loans/fixture-a", loan("fixture-a", input));
    expect(screen.getByTestId("text-loan-amount").textContent).toBe(output);
  });
  it("updates heading but not header selection on prop change", () => {
    const view = mount("Summary", "/loans/fixture-a", loan());
    const header = screen.getByTestId("loan-header");
    const selectedStyle = screen.getByTestId("tab-summary").getAttribute("style");
    view.update("Documents");
    expect(screen.getByTestId("loan-documents-page").querySelector("h2")?.textContent).toBe("Documents");
    expect(screen.getByTestId("loan-header")).toBe(header);
    expect(screen.getByTestId("tab-summary").getAttribute("style")).toBe(selectedStyle);
    expect(screen.getByTestId("tab-documents").style.color).toBe("var(--roads-text-primary)");
    expect(requests).toHaveLength(0);
  });
  it("toggles activity color without rendering an activity panel", () => {
    mount("Summary", "/loans/fixture-a", loan());
    const button = screen.getByTestId("button-sidebar-toggle");
    const before = button.getAttribute("style");
    fireEvent.click(button);
    expect(button.getAttribute("style")).not.toBe(before);
    expect(screen.queryByTestId("loan-activity-panel")).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute("style")).toBe(before);
  });
  it.each([
    ["summary", "/loans/fixture-a"], ["origination", "/loans/fixture-a/origination"],
    ["decisioning", "/loans/fixture-a/decisioning"], ["closing-booking", "/loans/fixture-a/closing-booking"],
    ["documents", "/loans/fixture-a/documents"], ["history", "/loans/fixture-a/history"],
  ])("retains the %s tab destination", (tab, destination) => {
    const { location } = mount("Unmapped", "/loans/fixture-a", loan());
    fireEvent.click(screen.getByTestId(`tab-${tab}`));
    expect(location.history?.at(-1)).toBe(destination);
  });
  it("preserves no-op controls and resets expansion on checklist reopen", () => {
    const { container, location } = mount("Summary", "/loans/fixture-a", loan());
    const before = container.innerHTML;
    for (const id of ["button-menu", "button-messages", "toolbar-loan-info", "toolbar-quick-links", "toolbar-key-dates", "toolbar-errors"])
      fireEvent.click(screen.getByTestId(id));
    expect(container.innerHTML).toBe(before);
    expect(location.history).toEqual(["/loans/fixture-a"]);
    fireEvent.click(screen.getByTestId("toolbar-checklist"));
    fireEvent.click(screen.getByTestId("link-view-task-0"));
    expect(screen.getByTestId("button-expand-task-0")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByTestId("button-expand-task-0"));
    expect(screen.getByTestId("button-expand-task-0")).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByTestId("button-close-checklist"));
    expect(screen.queryByTestId("checklist-panel")).toBeNull();
    fireEvent.click(screen.getByTestId("toolbar-checklist"));
    expect(screen.getByTestId("button-expand-task-0")).toHaveAttribute("aria-expanded", "false");
    expect(requests).toHaveLength(0);
  });
  it.each(["cancel", "success", "package-failure", "disclosure-failure"])(
    "records real provider reset ordering: %s", async mode => {
      mount("Summary", "/loans/fixture-a", loan());
      act(() => activity.addActivity({
        id: "synthetic-runtime", title: "Synthetic", description: "Synthetic",
        timestamp: "October 14, 2026", date: new Date("2026-10-14T16:00:00Z"),
      }));
      const events: string[] = [];
      const packageKey = closingPackageStorageKey("fixture-a");
      const disclosureKey = closingDisclosureStorageKey("fixture-a");
      localStorage.setItem(packageKey, "synthetic");
      const remove = Storage.prototype.removeItem;
      const set = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function(key) {
        if (key === packageKey) {
          events.push("package");
          if (mode === "package-failure") throw new Error("synthetic storage denial");
        }
        return remove.call(this, key);
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(key, value) {
        if (key === "loan-runtime-activity:fixture-a" && value === "[]") events.push("activity");
        if (key === disclosureKey) {
          events.push("disclosure");
          if (mode === "disclosure-failure") throw new Error("synthetic storage denial");
        }
        return set.call(this, key, value);
      });
      fireEvent.click(screen.getByTestId("toolbar-checklist"));
      fireEvent.click(screen.getByTestId("button-expand-task-0"));
      const version = checklist.demoResetVersion;
      vi.spyOn(window, "confirm").mockImplementation(() => { events.push("confirm"); return mode !== "cancel"; });
      fireEvent.click(screen.getByTestId("button-reset-demo"));
      expect(events).toEqual(mode === "cancel" ? ["confirm"] : mode === "package-failure"
        ? ["confirm", "package", "activity"] : ["confirm", "package", "disclosure", "activity"]);
      // Successful reset broadcasts twice: synchronous history subscription, then finish().
      // Both increments are current source behavior, not a requested normalization.
      expect(checklist.demoResetVersion).toBe(version + (mode === "success" ? 2 : 0));
      expect(activity.activityItems.some(item => item.id === "synthetic-runtime")).toBe(mode === "cancel");
      expect(screen.getByTestId("button-expand-task-0")).toHaveAttribute("aria-expanded", mode === "cancel" ? "true" : "false");
      expect(localStorage.getItem(packageKey)).toBe(["cancel", "package-failure"].includes(mode) ? "synthetic" : null);
    },
  );
});
