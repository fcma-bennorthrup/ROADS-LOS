import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { LoanActivityProvider, useActivityPanel } from "@/contexts/loan-activity-context";
import { ChecklistPanel } from "@/components/loan/ChecklistPanel";
import { useClosingPackage } from "@/hooks/use-closing-package";
import { useClosingDisclosures } from "@/hooks/use-closing-disclosures";
import { closingPackageStorageKey } from "@/lib/closing-package-progress";
import { closingDisclosureStorageKey, resetClosingDisclosureHistory } from "@/lib/closing-disclosure-history";
import { toast, dismissToasts } from "@/hooks/use-toast";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn(), dismissToasts: vi.fn() }));
const clock = "2026-10-14T16:00:00.000Z";
const packageKey = closingPackageStorageKey("one");
const disclosureKey = closingDisclosureStorageKey("one");
const checklistKey = "loan-checklist-statuses:one";
const activityKey = "loan-runtime-activity:one";
const record = { id: 1, generatedAt: clock, deliveredAt: null };
const runtime = { id: "synthetic", title: "Synthetic", description: "", timestamp: clock, date: clock };
let latest: ReturnType<typeof useChecklist>;

function State({ loanId }: { loanId: string }) {
  const checklist = useChecklist();
  latest = checklist;
  const { activityItems } = useActivityPanel();
  const pkg = useClosingPackage(loanId);
  const cd = useClosingDisclosures(loanId);
  return <>
    <output data-testid="state">{JSON.stringify({
      version: checklist.demoResetVersion, pending: checklist.demoResetPending,
      activities: activityItems.map((item) => item.id),
      package: pkg.generationState, delivered: pkg.lastDelivered, disclosures: cd.records.length,
      decision: checklist.getActionStatus("Loan Decision", 0),
      packageTask: checklist.getActionStatus("Closing Package", 0),
      disclosureTask: checklist.getActionStatus("Closing Disclosure", 0),
    })}</output>
    <button onClick={pkg.generate}>Generate fixture package</button>
  </>;
}

function Fixture({ hook, loanId = "one", panel = true }: {
  hook: ReturnType<typeof memoryLocation>["hook"]; loanId?: string; panel?: boolean;
}) {
  return <Router hook={hook}><LoanActivityProvider><ChecklistProvider>
    <State key={loanId} loanId={loanId} />
    {panel && <ChecklistPanel onClose={() => {}} />}
  </ChecklistProvider></LoanActivityProvider></Router>;
}

const state = () => JSON.parse(screen.getByTestId("state").textContent!);
const reset = () => fireEvent.click(screen.getByTestId("button-reset-demo"));
function seed(loanId = "one") {
  localStorage.setItem(closingPackageStorageKey(loanId), JSON.stringify({
    generatedAt: clock, generatingUntil: null, deliveredAt: clock,
  }));
  localStorage.setItem(closingDisclosureStorageKey(loanId), JSON.stringify([record]));
  localStorage.setItem(`loan-checklist-statuses:${loanId}`, JSON.stringify({
    "Loan Decision": ["complete"], "Closing Package": ["complete", "complete", "complete"],
    "Closing Disclosure": ["complete", "complete"],
  }));
  localStorage.setItem(`loan-runtime-activity:${loanId}`, JSON.stringify([runtime]));
}
function setup() {
  seed();
  const location = memoryLocation({ path: "/loans/one/documents" });
  return { ...render(<Fixture hook={location.hook} />), location };
}
function denyWrite(key: string) {
  const original = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, name, value) {
    if (name === key) throw new Error("synthetic denied write");
    return original.call(this, name, value);
  });
}
function locks() {
  const queue: { succeed: () => void; fail: () => void }[] = [];
  const request = vi.fn((_key: string, write: () => void) => new Promise<void>((resolve, reject) => {
    queue.push({
      succeed: () => { try { write(); resolve(); } catch (error) { reject(error); } },
      fail: () => reject(new Error("synthetic lock failure")),
    });
  }));
  Object.defineProperty(navigator, "locks", { value: { request }, configurable: true });
  return { request, queue };
}
async function flush(run: () => void) { await act(async () => { run(); await Promise.resolve(); }); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(clock));
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  // Serial reset-policy cases run on the supported-browser path. Unsupported
  // disclosure writes are characterized separately by disclosure-coordination.
  Object.defineProperty(navigator, "locks", {
    value: { request: (_name: string, write: () => void) => write() }, configurable: true,
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("approved per-store Reset Demo outcomes", () => {
  it("cancel changes no storage, tasks, activities, expansion, notifications or toasts", () => {
    setup();
    fireEvent.click(screen.getByTestId("button-expand-task-2"));
    const before = { ...localStorage };
    vi.mocked(window.confirm).mockReturnValue(false);
    reset();
    expect({ ...localStorage }).toEqual(before);
    expect(state()).toMatchObject({ version: 0, decision: "complete", package: "generated", disclosures: 1 });
    expect(state().activities).toContain("synthetic");
    expect(screen.getByTestId("button-expand-task-2")).toHaveAttribute("aria-expanded", "true");
    expect(toast).not.toHaveBeenCalled();
    expect(dismissToasts).not.toHaveBeenCalled();
  });

  it("denied package removal leaves every store and mounted state untouched", () => {
    setup();
    const before = { ...localStorage };
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
    reset();
    expect({ ...localStorage }).toEqual(before);
    expect(state()).toMatchObject({ version: 0, pending: false, package: "generated", delivered: clock, disclosures: 1, decision: "complete" });
    expect(state().activities).toContain("synthetic");
    expect(dismissToasts).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      title: "Demo reset incomplete",
      description: "Cleared: none. Not cleared: Closing Package, Closing Disclosure, Checklist, Loan Activity. Enable browser storage and try Reset Demo again.",
    }));
  });

  it("failed disclosure retains package clear, reconciles only its task, and permits manual retry", () => {
    setup();
    const activity = localStorage.getItem(activityKey);
    const disclosure = localStorage.getItem(disclosureKey);
    const denied = denyWrite(disclosureKey);
    reset();
    expect(localStorage.getItem(packageKey)).toBeNull();
    expect(localStorage.getItem(disclosureKey)).toBe(disclosure);
    expect(localStorage.getItem(activityKey)).toBe(activity);
    expect(state()).toMatchObject({ package: "idle", packageTask: "not-started", disclosureTask: "complete", decision: "complete", version: 0 });
    expect(JSON.parse(localStorage.getItem(checklistKey)!)["Loan Decision"]).toEqual(["complete"]);
    expect(toast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      description: "Cleared: Closing Package, Document checklist tasks. Not cleared: Closing Disclosure, Checklist, Loan Activity. Enable browser storage and try Reset Demo again.",
    }));
    denied.mockRestore();
    reset();
    expect(state()).toMatchObject({ version: 1, decision: "not-started", disclosures: 0, pending: false });
    expect(state().activities).not.toContain("synthetic");
    expect(localStorage.getItem(activityKey)).toBe("[]");
    expect(dismissToasts).toHaveBeenCalledTimes(1);
  });

  it.each(["succeed", "fail"] as const)("queued lock %s keeps activity and unrelated tasks until completion", async (outcome) => {
    setup();
    const { queue, request } = locks();
    reset();
    expect(state()).toMatchObject({ pending: true, version: 0, package: "idle", decision: "complete", disclosures: 1 });
    expect(state().activities).toContain("synthetic");
    expect(screen.getByTestId("button-reset-demo")).toBeDisabled();
    reset();
    act(() => { expect(latest.resetDemoTasks(["Closing Disclosure"])).toMatchObject({ outcome: "pending" }); });
    expect(request).toHaveBeenCalledTimes(1);
    await flush(queue[0][outcome]);
    expect(state().pending).toBe(false);
    expect(state().version).toBe(outcome === "succeed" ? 1 : 0);
    expect(state().disclosures).toBe(outcome === "succeed" ? 0 : 1);
    expect(state().activities.includes("synthetic")).toBe(outcome === "fail");
    expect(toast).toHaveBeenCalledTimes(outcome === "fail" ? 1 : 0);
    expect(dismissToasts).toHaveBeenCalledTimes(outcome === "succeed" ? 1 : 0);
    expect(localStorage.getItem(packageKey)).toBeNull();
  });

  it("package generation cannot restore cleared progress during a queued or failed reset", async () => {
    setup();
    localStorage.removeItem(packageKey);
    // Remount to seed a running generation.
    cleanup();
    const location = memoryLocation({ path: "/loans/one/documents" });
    render(<Fixture hook={location.hook} />);
    fireEvent.click(screen.getByText("Generate fixture package"));
    expect(state().package).toBe("generating");
    const { queue } = locks();
    reset();
    fireEvent.click(screen.getByText("Generate fixture package"));
    act(() => { vi.advanceTimersByTime(6000); });
    expect(localStorage.getItem(packageKey)).toBeNull();
    expect(state().package).toBe("idle");
    await flush(queue[0].fail);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(localStorage.getItem(packageKey)).toBeNull();
  });

  it("closing/remounting only the checklist panel keeps the pending operation coordinated", async () => {
    const app = setup();
    const { queue } = locks();
    reset();
    app.rerender(<Fixture hook={app.location.hook} panel={false} />);
    app.rerender(<Fixture hook={app.location.hook} />);
    expect(screen.getByTestId("button-reset-demo")).toBeDisabled();
    await flush(queue[0].succeed);
    expect(state()).toMatchObject({ version: 1, pending: false, decision: "not-started" });
    expect(state().activities).not.toContain("synthetic");
  });

  it("provider unmount cancels queued writes and leaves prior package clear on remount", async () => {
    const app = setup();
    const before = localStorage.getItem(disclosureKey);
    const { queue } = locks();
    reset();
    await flush(app.unmount);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining("Remaining reset work was cancelled."),
    }));
    render(<Fixture hook={app.location.hook} />);
    await flush(queue[0].succeed);
    expect(localStorage.getItem(disclosureKey)).toBe(before);
    expect(localStorage.getItem(packageKey)).toBeNull();
    expect(state()).toMatchObject({ version: 0, package: "idle", disclosures: 1, decision: "complete", pending: false });
    expect(state().activities).toContain("synthetic");
  });

  it("reports a disclosure write that committed just before leaving, without a late full reset", async () => {
    const app = setup();
    const { queue } = locks();
    reset();
    await flush(() => {
      queue[0].succeed();
      app.unmount();
    });
    expect(JSON.parse(localStorage.getItem(disclosureKey)!).records).toEqual([]);
    expect(JSON.parse(localStorage.getItem(activityKey)!)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(checklistKey)!)["Loan Decision"]).toEqual(["complete"]);
    expect(toast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      description: "Remaining reset work was cancelled. Cleared: Closing Package, Closing Disclosure, Document checklist tasks. Not cleared: Checklist, Loan Activity. Enable browser storage and try Reset Demo again.",
    }));
    expect(dismissToasts).not.toHaveBeenCalled();
  });

  it("a synchronously rejected lock request retains the successful package clear", () => {
    setup();
    Object.defineProperty(navigator, "locks", { configurable: true, value: {
      request() { throw new Error("Synthetic unavailable lock"); },
    } });
    reset();
    expect(state()).toMatchObject({ version: 0, pending: false, package: "idle", disclosures: 1, decision: "complete" });
    expect(state().activities).toContain("synthetic");
    expect(localStorage.getItem(packageKey)).toBeNull();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(dismissToasts).not.toHaveBeenCalled();
  });

  it("loan A cancellation cannot clear loan B or resume writes on A after returning", async () => {
    const app = setup();
    seed("two");
    const twoPackage = localStorage.getItem(closingPackageStorageKey("two"));
    const { queue } = locks();
    reset();
    await flush(() => app.location.navigate("/loans/two/documents"));
    app.rerender(<Fixture hook={app.location.hook} loanId="two" />);
    await flush(queue[0].succeed);
    expect(localStorage.getItem(closingPackageStorageKey("two"))).toBe(twoPackage);
    expect(state()).toMatchObject({ version: 0, decision: "complete", disclosures: 1 });
    await flush(() => app.location.navigate("/loans/one/documents"));
    app.rerender(<Fixture hook={app.location.hook} />);
    expect(state()).toMatchObject({ version: 0, package: "idle", disclosures: 1, decision: "complete" });
  });

  it("a denied checklist write retains checklist/activity and reports both cleared documents", () => {
    setup();
    const before = localStorage.getItem(checklistKey);
    denyWrite(checklistKey);
    reset();
    expect(localStorage.getItem(checklistKey)).toBe(before);
    expect(state()).toMatchObject({ version: 0, decision: "complete", packageTask: "complete", disclosures: 0, package: "idle" });
    expect(state().activities).toContain("synthetic");
    expect(toast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      description: "Cleared: Closing Package, Closing Disclosure. Not cleared: Checklist, Loan Activity. Enable browser storage and try Reset Demo again.",
    }));
  });

  it("denied activity write retains activity but keeps a successful checklist reset", () => {
    setup();
    const before = localStorage.getItem(activityKey);
    denyWrite(activityKey);
    reset();
    expect(localStorage.getItem(activityKey)).toBe(before);
    expect(state()).toMatchObject({ version: 1, decision: "not-started", disclosures: 0, package: "idle" });
    expect(state().activities).toContain("synthetic");
    expect(dismissToasts).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      description: "Cleared: Closing Package, Closing Disclosure, Checklist. Not cleared: Loan Activity. Enable browser storage and try Reset Demo again.",
    }));
  });

  it("successful repeats emit one notification each and persist across reload without replay", () => {
    const app = setup();
    reset();
    expect(state().version).toBe(1);
    reset();
    expect(state().version).toBe(2);
    app.unmount();
    render(<Fixture hook={app.location.hook} />);
    expect(state()).toMatchObject({ version: 0, decision: "not-started", disclosures: 0, package: "idle" });
    expect(state().activities).not.toContain("synthetic");
    expect(toast).not.toHaveBeenCalled();
    expect(dismissToasts).toHaveBeenCalledTimes(2);
  });

  it("disclosure-only reset remains isolated from package, activity and the demo broadcast", () => {
    setup();
    const beforePackage = localStorage.getItem(packageKey);
    const beforeActivity = localStorage.getItem(activityKey);
    act(() => { resetClosingDisclosureHistory("one", true); });
    expect(localStorage.getItem(packageKey)).toBe(beforePackage);
    expect(localStorage.getItem(activityKey)).toBe(beforeActivity);
    expect(state()).toMatchObject({ version: 0, decision: "complete", package: "generated", disclosures: 0 });
    expect(toast).not.toHaveBeenCalled();
    expect(dismissToasts).not.toHaveBeenCalled();
  });
});
