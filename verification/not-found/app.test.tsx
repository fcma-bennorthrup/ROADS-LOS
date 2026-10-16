import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { navigate } from "wouter/use-browser-location";
import { queryClient } from "@/lib/queryClient";
import { useActivityPanel } from "@/contexts/loan-activity-context";
import { useChecklist } from "@/contexts/checklist-context";
import { useGitHubSyncContext } from "@/contexts/github-sync-context";
import { dismissToasts } from "@/hooks/use-toast";
import App from "@/App";

const clientSlot = vi.hoisted(() => ({ current: null as QueryClient | null }));
vi.mock("@/lib/queryClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/queryClient")>();
  const defaults = original.queryClient.getDefaultOptions();
  clientSlot.current = new QueryClient({ defaultOptions: defaults });
  return { ...original, get queryClient() { return clientSlot.current!; } };
});

// Keep the actual App/Switch/browser-location, fallback, keyed providers,
// query policy, sync hook, toaster, and Radix conflict dialog. Only known loan
// pages become sentinels: their content belongs to other verification tasks.
// Summary remains real so missing data is distinguished from an unmatched URL.
vi.mock("@/pages/loan-origination", () => ({ default: () => <Probe name="origination" /> }));
vi.mock("@/pages/loan-decisioning", () => ({ default: () => <Probe name="decisioning" /> }));
vi.mock("@/pages/loan-documents", () => ({ default: () => <Probe name="documents" /> }));
vi.mock("@/pages/loan-closing-booking", () => ({ default: () => <Probe name="closing-booking" /> }));
vi.mock("@/pages/loan-history", () => ({ default: () => <Probe name="history" /> }));
// No fallback controls/probes are inserted: its markup stays real and exact.

function Probe({ name }: { name: string }) {
  const activity = useActivityPanel();
  const checklist = useChecklist();
  const sync = useGitHubSyncContext();
  return <section data-testid="sentinel" data-page={name}>
    <output data-testid="panel">{String(activity.activityPanelOpen)}</output>
    <output data-testid="status">{checklist.getActionStatus("Loan Decision", 0)}</output>
    <output data-testid="reset">{checklist.demoResetVersion}</output>
    <output data-testid="items">{activity.activityItems.map(i => i.id).join(",")}</output>
    <button onClick={activity.toggleActivityPanel}>Fixture toggle</button>
    <button onClick={() => {
      checklist.setActionStatus("Loan Decision", 0, "complete");
      activity.addActivity({ id: "synthetic", title: "Synthetic event", description: "Fixture",
        timestamp: "fixed", date: new Date("2026-10-14T16:00:00Z") });
    }}>Fixture save</button>
    <button onClick={() => sync.pullMutation.mutate()}>Fixture delayed sync</button>
    <button onClick={sync.openConflictDialog}>Fixture open dialog</button>
  </section>;
}

const emptyConflicts = { hasConflicts: false, operation: null, conflicts: [] };
const conflicts = { hasConflicts: true, operation: "pull", commitSha: "synthetic-sha",
  conflicts: [{ path: "synthetic.txt", reason: "both changed", localContent: "local",
    remoteContent: "remote", baseContent: "base" }] };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
let calls: { url: string; options?: RequestInit }[];
let unexpected: string[];
let conflictReply: () => Promise<Response>;
let pullReply: (() => Promise<Response>) | undefined;
beforeEach(() => {
  const defaults = queryClient.getDefaultOptions();
  queryClient.clear();
  clientSlot.current = new QueryClient({ defaultOptions: defaults });
  calls = []; unexpected = [];
  conflictReply = async () => reply(emptyConflicts);
  pullReply = undefined;
  // Default-deny; no original fetch saved and no network fallback.
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    calls.push({ url, options });
    if (url === "/api/github/conflicts" && !options?.method) return conflictReply();
    if (url === "/api/loans/missing" && !options?.method) return reply({ message: "Loan not found" }, 404);
    if (url === "/api/loans/1" && !options?.method) return reply(null);
    if (url === "/api/github/pull" && options?.method === "POST" && pullReply) return pullReply();
    unexpected.push(`${options?.method ?? "GET"} ${url}`);
    throw new Error("UNEXPECTED_FIXTURE_TRANSPORT");
  }));
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  dismissToasts();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  expect(unexpected).toEqual([]);
});
function mount(path: string) {
  window.history.replaceState({}, "", path);
  return render(<App />);
}
async function go(path: string) {
  await act(async () => { navigate(path); });
}
async function settled() {
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
}
const heading = () => screen.getByRole("heading", { level: 1, name: "404 Page Not Found" });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name, exact: true }));
function expectFallback() {
  expect(heading()).toBeInTheDocument();
  expect(screen.queryByTestId("sentinel")).not.toBeInTheDocument();
}

describe("unchanged fallback through the real App router", () => {
  it("retains literal native markup, shared Card classes and no page-owned controls", async () => {
    const { container } = mount("/unknown");
    await settled();
    const h1 = heading();
    const row = h1.parentElement!;
    const content = row.parentElement!;
    const card = content.parentElement!;
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(row.children[0].tagName.toLowerCase()).toBe("svg");
    expect(row.children[1]).toBe(h1);
    expect(row).toHaveClass("flex", "mb-4", "gap-2");
    expect(row.children[0]).toHaveClass("h-8", "w-8", "text-red-500");
    expect(h1).toHaveClass("text-2xl", "font-bold", "text-gray-900");
    expect(content.children).toHaveLength(2);
    expect(content.children[1].tagName).toBe("P");
    expect(content.children[1].textContent?.trim()).toBe("Did you forget to add the page to the router?");
    expect(content.children[1]).toHaveClass("mt-4", "text-sm", "text-gray-600");
    expect(content).toHaveClass("p-6", "pt-6");
    expect(content).not.toHaveClass("pt-0");
    expect(card).toHaveClass("shadcn-card", "rounded-xl", "border", "bg-card",
      "border-card-border", "text-card-foreground", "shadow-sm", "w-full", "max-w-md", "mx-4");
    expect(card.parentElement).toHaveClass("min-h-screen", "w-full", "flex",
      "items-center", "justify-center", "bg-gray-50");
    expect(card.querySelectorAll("button,a,input,select,textarea,[tabindex],[role=button]")).toHaveLength(0);
    expect(card.querySelector("main,[aria-live]")).toBeNull();
    expect(window.location.pathname).toBe("/unknown");
    expect(calls).toEqual([{ url: "/api/github/conflicts", options: { credentials: "include" } }]);
    expect(localStorage.getItem("loan-runtime-activity:prototype")).toBe("[]");
    expect(localStorage.getItem("loan-checklist-statuses:prototype")).not.toBeNull();
  });

  it("redirects root to Summary and distinguishes missing-loan data error from fallback", async () => {
    mount("/");
    await screen.findByTestId("error-state");
    expect(window.location.pathname).toBe("/loans/1");
    expect(screen.queryByText("404 Page Not Found")).not.toBeInTheDocument();
    await go("/loans/missing");
    await screen.findByTestId("error-state");
    expect(screen.getByTestId("error-state")).toHaveTextContent("Failed to load loan data");
    expect(calls.filter(c => c.url === "/api/loans/missing")).toHaveLength(1);
    await go("/loans/missing/unknown");
    expectFallback();
  });

  it.each(["origination", "decisioning", "closing-booking", "documents", "history"])(
    "reaches the known %s route", async (name) => {
      mount(`/loans/synthetic/${name}`);
      await settled();
      expect(screen.getByTestId("sentinel")).toHaveAttribute("data-page", name);
      expect(screen.queryByText("404 Page Not Found")).not.toBeInTheDocument();
    });

  it.each(["/unknown", "/loans", "/404", "/design-system", "/loan-coming-soon",
    "/loans/a/unknown", "/loans/a/coming-soon", "/loans//history", "/loans/a/history/extra",
    "/unknown?x=1#anchor"])("keeps unmatched/support path %s at fallback", async (path) => {
      mount(path); await settled(); expectFallback();
      expect(window.location.pathname + window.location.search + window.location.hash).toBe(path);
      expect(calls.map(c => c.url)).toEqual(["/api/github/conflicts"]);
    });

  it.each(["/loans/a/history?x=1#anchor", "/loans/a/history/", "/LOANS/a/HISTORY",
    "/loans/a%2Fb/history", "/loans/%61/history"])(
    "characterizes Wouter matching at %s without replacing the router", async (path) => {
      mount(path); await settled();
      expect(screen.getByTestId("sentinel")).toHaveAttribute("data-page", "history");
      expect(window.location.pathname + window.location.search + window.location.hash).toBe(path);
    });
});

describe("provider and global lifetimes on fallback", () => {
  it("retains same-key state, remounts at prototype, restores saved data but not panel openness", async () => {
    const added = vi.spyOn(window, "addEventListener");
    const removed = vi.spyOn(window, "removeEventListener");
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const { unmount } = mount("/loans/a/history");
    await settled();
    click("Fixture toggle"); click("Fixture save");
    expect(screen.getByTestId("panel")).toHaveTextContent("true");
    const subscriptions = () => added.mock.calls.filter(c => c[0] === "closing-disclosure-history-changed");
    const initialSubscription = subscriptions()[0][1];
    writes.mockClear();
    await go("/loans/a/unknown"); expectFallback();
    expect(subscriptions()).toHaveLength(1);
    expect(writes).not.toHaveBeenCalled();
    await go("/loans/a/history");
    expect(screen.getByTestId("panel")).toHaveTextContent("true");
    expect(screen.getByTestId("status")).toHaveTextContent("complete");
    await go("/unknown");
    expect(removed).toHaveBeenCalledWith("closing-disclosure-history-changed", initialSubscription);
    expect(subscriptions()).toHaveLength(2);
    expect(writes.mock.calls.map(c => c[0])).toEqual([
      "loan-checklist-statuses:prototype", "loan-runtime-activity:prototype"]);
    writes.mockClear();
    await go("/other-unknown");
    expect(subscriptions()).toHaveLength(2);
    expect(writes).not.toHaveBeenCalled();
    await go("/loans/a/history");
    expect(screen.getByTestId("panel")).toHaveTextContent("false");
    expect(screen.getByTestId("status")).toHaveTextContent("complete");
    expect(screen.getByTestId("items")).toHaveTextContent("synthetic");
    await go("/loans/b/history");
    expect(screen.getByTestId("status")).toHaveTextContent("not-started");
    expect(screen.getByTestId("items")).not.toHaveTextContent("synthetic");
    unmount();
    for (const call of added.mock.calls.filter(c =>
      c[0] === "storage" || c[0] === "closing-disclosure-history-changed")) {
      expect(removed).toHaveBeenCalledWith(call[0], call[1]);
    }
    expect(queryClient.getQueryCache().find({ queryKey: ["/api/github/conflicts"] })?.getObserversCount()).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it("observes disclosure events on fallback and releases the old loan subscription", async () => {
    mount("/loans/a/history"); await settled();
    await go("/loans/a/unknown");
    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: "loan-closing-disclosures:a", newValue: null, storageArea: localStorage,
    })));
    await go("/loans/a/history");
    expect(screen.getByTestId("reset")).toHaveTextContent("1");
    await go("/unknown");
    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: "loan-closing-disclosures:a", newValue: null, storageArea: localStorage,
    })));
    await go("/loans/a/history");
    expect(screen.getByTestId("reset")).toHaveTextContent("0");
  });

  it("handles jsdom Back/Forward and App remount without losing saved loan data", async () => {
    const first = mount("/loans/a/history"); await settled();
    click("Fixture save"); click("Fixture toggle");
    await go("/loans/a/unknown");
    await go("/unknown");
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(window.location.pathname).toBe("/loans/a/unknown"));
    expectFallback();
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(screen.getByTestId("sentinel")).toBeInTheDocument());
    expect(screen.getByTestId("panel")).toHaveTextContent("false");
    expect(screen.getByTestId("status")).toHaveTextContent("complete");
    await act(async () => { window.history.forward(); });
    await waitFor(() => expect(window.location.pathname).toBe("/loans/a/unknown"));
    expectFallback();
    first.unmount();
    // App remount, NOT a claim of real browser reload/module reset.
    mount("/loans/a/history");
    expect(screen.getByTestId("status")).toHaveTextContent("complete");
    expect(screen.getByTestId("items")).toHaveTextContent("synthetic");
    expect(screen.getByTestId("panel")).toHaveTextContent("false");
  });

  it.each(["invalid", "denied"] as const)("keeps fallback visible with %s storage", async mode => {
    if (mode === "invalid") {
      for (const key of ["loan-checklist-statuses", "loan-runtime-activity", "loan-closing-disclosures"])
        localStorage.setItem(`${key}:prototype`, "not JSON");
    } else {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("fixture denied"); });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("fixture denied"); });
    }
    mount("/unknown"); await settled();
    expectFallback();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["empty", "cached", "failed"] as const)(
    "%s conflict GET never opens the dialog automatically", async mode => {
      if (mode === "cached") queryClient.setQueryData(["/api/github/conflicts"], conflicts);
      if (mode === "failed") conflictReply = async () => reply({ message: "synthetic failure" }, 500);
      mount("/unknown"); await settled();
      expectFallback();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await go("/another-unknown"); await settled();
      expect(calls).toHaveLength(mode === "cached" ? 0 : 1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

  it("inherits an already-open real dialog and closes with Escape after route change", async () => {
    mount("/loans/a/history"); await settled();
    click("Fixture open dialog");
    expect(await screen.findByRole("dialog")).toHaveTextContent("No Conflicts");
    await go("/unknown");
    // Radix hides background content from the accessibility tree while modal.
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByText("404 Page Not Found")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    fireEvent.keyDown(document.activeElement!, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(document.body);
    expect(calls).toHaveLength(1);
  });

  it("shows a delayed fake conflict response and inherited toast after the loan page unmounts", async () => {
    let finish!: (r: Response) => void;
    pullReply = () => new Promise(resolve => { finish = resolve; });
    mount("/loans/a/history"); await settled();
    click("Fixture delayed sync");
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    await go("/unknown"); expectFallback();
    await act(async () => { finish(reply(conflicts, 409)); });
    expect(await screen.findByRole("dialog")).toHaveTextContent("Resolve Conflicts");
    expect(screen.getByText("Conflicts Detected")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    expect(calls.filter(c => c.options?.method)).toEqual([{
      url: "/api/github/pull", options: { method: "POST", credentials: "include" },
    }]);
    fireEvent.keyDown(document.activeElement!, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(heading()).toBeInTheDocument();
    expect(screen.getByText("Conflicts Detected")).toBeInTheDocument();
  });
});
