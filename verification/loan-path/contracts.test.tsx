import { writeFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Router, useLocation } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { loanIdFromPath } from "@/lib/loan-path";
import { LoanActivityProvider, useActivityPanel } from "@/contexts/loan-activity-context";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { CollateralContent } from "@/components/loan/CollateralContent";
import { LoanHeader } from "@/components/loan/LoanHeader";

vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

it("preserves raw segments, start anchoring, and caller-specific defaults", () => {
  const paths = [
    "", "/", "/loans", "/loans/", "/loans//x", "/unknown",
    "/loans/a", "/loans/b/origination", "/loans/a/unknown/nested",
    "/prefix/loans/a", "/LOANS/a", "/loans/%2F", "/loans/0",
    "/loans/a?section=Fees", "/loans/a#hash", "/loans/ a ",
    "/loans/a/loans/b", "/loans/\n", "/loans/😀",
  ];
  for (const path of paths) {
    for (const fallback of ["prototype", "1", ""]) {
      expect(loanIdFromPath(path, fallback)).toBe(path.match(/^\/loans\/([^/]+)/)?.[1] ?? fallback);
    }
  }
  expect(loanIdFromPath("/prefix/loans/a", "prototype")).toBe("prototype");
  expect(loanIdFromPath("/loans/%2F", "prototype")).toBe("%2F");
});

it.each(["corrupt", "denied"])("preserves defaults with %s storage", mode => {
  window.history.replaceState(null, "", "/loans/synthetic-a/origination");
  if (mode === "corrupt") {
    for (const prefix of ["loan-checklist-statuses", "loan-runtime-activity", "loan-subject-property"]) {
      localStorage.setItem(`${prefix}:synthetic-a`, "{invalid");
    }
  } else {
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error("Fixture denied"); });
    }
  }
  render(<Router><LoanActivityProvider><ChecklistProvider><Probe /></ChecklistProvider></LoanActivityProvider></Router>);
  expect(screen.getByTestId("state")).toHaveTextContent('"status":"not-started"');
  expect(screen.getByTestId("state")).toHaveTextContent('"open":false');
  expect(screen.getByTestId("field-address-1")).toHaveTextContent("Address");
  fireEvent.click(screen.getByTestId("address-button-edit"));
  fireEvent.change(screen.getByTestId("input-address-1"), { target: { value: "Synthetic retained locally" } });
  fireEvent.click(screen.getByTestId("address-button-save"));
  expect(screen.getByTestId("field-address-1")).toHaveTextContent("Synthetic retained locally");
});

function Probe() {
  const activity = useActivityPanel();
  const checklist = useChecklist();
  const [location] = useLocation();
  return <>
    <output data-testid="path">{location}</output>
    <output data-testid="state">{JSON.stringify({
      open: activity.activityPanelOpen,
      items: activity.activityItems.map(item => item.id),
      status: checklist.getActionStatus("Loan Decision", 0),
      reset: checklist.demoResetVersion,
    })}</output>
    <button onClick={() => {
      checklist.setActionStatus("Loan Decision", 0, "complete");
      activity.addActivity({ id: "synthetic-event", title: "Synthetic event",
        description: "Fixture only", timestamp: "fixed", date: new Date() });
      activity.toggleActivityPanel();
    }}>Fixture save</button>
    <button onClick={() => {
      checklist.resetDemoTasks(checklist.tasks.map(task => task.name));
      activity.resetRuntimeActivities();
    }}>Fixture reset</button>
    <LoanHeader borrowerName="Synthetic Borrower" loanNumber="SYNTHETIC" />
    {location.endsWith("/origination") && <CollateralContent borrowerName="Synthetic Borrower" />}
  </>;
}

it("compares exact storage order, DOM, saved state, and local lifetimes through navigation", async () => {
  vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
  const calls: unknown[] = [];
  for (const method of ["getItem", "setItem", "removeItem"] as const) {
    const original = Storage.prototype[method];
    vi.spyOn(Storage.prototype, method).mockImplementation(function(this: Storage, ...args: any[]) {
      calls.push([method, ...args]);
      return (original as Function).apply(this, args);
    } as any);
  }
  window.history.replaceState(null, "", "/loans/synthetic-a/origination?section=Collateral");
  const view = render(<Router><LoanActivityProvider><ChecklistProvider><Probe /></ChecklistProvider></LoanActivityProvider></Router>);
  const traces: unknown[] = [];
  function capture(label: string) {
    traces.push({ label, html: view.container.innerHTML, calls: calls.splice(0),
      storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage[key]])) });
  }
  async function go(path: string) {
    await act(async () => { navigate(path); });
    capture(path);
  }
  capture("initial");
  fireEvent.click(screen.getByText("Fixture save"));
  capture("saved activity and checklist");
  fireEvent.click(screen.getByTestId("address-button-edit"));
  fireEvent.change(screen.getByTestId("input-address-1"), { target: { value: "Synthetic address A" } });
  fireEvent.click(screen.getByTestId("address-button-save"));
  capture("saved address");
  await go("/loans/synthetic-a/unknown/nested");
  expect(screen.getByTestId("state")).toHaveTextContent('"open":true');
  await go("/loans/synthetic-b/origination");
  expect(screen.getByTestId("state")).toHaveTextContent('"open":false');
  expect(screen.getByTestId("state")).not.toHaveTextContent("synthetic-event");
  await act(async () => { window.history.back(); });
  await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/loans/synthetic-a/unknown/nested"));
  capture("back");
  expect(screen.getByTestId("state")).toHaveTextContent("synthetic-event");
  await act(async () => { window.history.forward(); });
  await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/loans/synthetic-b/origination"));
  capture("forward");
  await go("/loans/synthetic-a/origination");
  expect(screen.getByTestId("field-address-1")).toHaveTextContent("Synthetic address A");
  fireEvent.click(screen.getByText("Fixture reset"));
  capture("reset");
  for (const path of ["/loans/", "/unknown", "/prefix/loans/synthetic-b"]) {
    await go(path);
    fireEvent.click(screen.getByTestId("tab-documents"));
    capture(`header navigation from ${path}`);
    expect(window.location.pathname).toBe(path.startsWith("/prefix") ? "/loans/synthetic-b/documents" : "/loans/1/documents");
  }
  cleanup();
  capture("unmounted");
  writeFileSync(process.env.LOAN_PATH_TRACE!, JSON.stringify(traces, null, 2));
});
