import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChecklistProvider, useChecklist } from "./checklist-context";

const state = vi.hoisted(() => ({
  version: 0,
  document: { mode: "empty", businessRules: { trid: { status: "not-triggered" }, loanDecision: { ready: false } } },
  listeners: new Set<() => void>(),
}));
vi.mock("@/lib/loan-application-store", () => ({
  applicationStore: {
    get document() { return state.document; },
    snapshot: () => state.version,
    subscribe: (fn: () => void) => { state.listeners.add(fn); return () => state.listeners.delete(fn); },
  },
  loanStorage: {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  },
}));
function Probe() {
  const { tasks, setActionStatus } = useChecklist();
  return <>
    <div data-testid="estimate-status">{tasks.find(t => t.name === "Loan Estimate")?.actions.map(a => a.status).join(",")}</div>
    <div data-testid="decision-status">{tasks.find(t => t.name === "Loan Decision")?.actions[0].status}</div>
    <button onClick={() => setActionStatus("Loan Decision", 0, "complete")}>Complete decision</button>
  </>;
}
afterEach(() => { cleanup(); localStorage.clear(); });
it("starts the estimate when the acknowledged TRID rule changes and retains progress on reload", () => {
  const view = render(<ChecklistProvider><Probe /></ChecklistProvider>);
  expect(screen.getByTestId("estimate-status")).toHaveTextContent("not-started,not-started");
  act(() => {
    state.document.businessRules.trid.status = "required";
    state.version++;
    state.listeners.forEach(fn => fn());
  });
  expect(screen.getByTestId("estimate-status")).toHaveTextContent("in-progress,not-started");
  view.unmount();
  render(<ChecklistProvider><Probe /></ChecklistProvider>);
  expect(screen.getByTestId("estimate-status")).toHaveTextContent("in-progress,not-started");
});
it("starts Loan Decision from the acknowledged rule and preserves completion on reload", () => {
  const view = render(<ChecklistProvider><Probe /></ChecklistProvider>);
  expect(screen.getByTestId("decision-status")).toHaveTextContent("not-started");
  act(() => {
    state.document.businessRules.loanDecision.ready = true;
    state.version++;
    state.listeners.forEach(fn => fn());
  });
  expect(screen.getByTestId("decision-status")).toHaveTextContent("in-progress");
  act(() => { screen.getByText("Complete decision").click(); });
  view.unmount();
  render(<ChecklistProvider><Probe /></ChecklistProvider>);
  expect(screen.getByTestId("decision-status")).toHaveTextContent("complete");
});
