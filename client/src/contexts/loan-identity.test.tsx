import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { LoanIdProvider, useLoanId, useOptionalLoanId } from "./loan-id-context";
import { LoanActivityProvider, useActivityPanel } from "./loan-activity-context";
import { ChecklistProvider, useChecklist } from "./checklist-context";

afterEach(cleanup);
function Identity() {
  const id = useLoanId();
  const checklist = useChecklist();
  const activity = useActivityPanel();
  return <span>{id}:{checklist.tasks.length}:{String(activity.activityPanelOpen)}</span>;
}
it("retains the explicit loan identity under relative nested routes", () => {
  const { hook } = memoryLocation({ path: "/loans/opaque-id/origination" });
  render(<Router hook={hook}><Route path="/loans/:id" nest>
    <LoanIdProvider id="opaque-id"><LoanActivityProvider><ChecklistProvider>
      <Route path="/origination"><Identity /></Route>
    </ChecklistProvider></LoanActivityProvider></LoanIdProvider>
  </Route></Router>);
  expect(screen.getByText(/^opaque-id:/)).toBeInTheDocument();
});
it("does not imply a seed loan outside a loan scope", () => {
  function Outside() { return <span>{useOptionalLoanId() ?? "app-level"}</span>; }
  render(<Outside />);
  expect(screen.getByText("app-level")).toBeInTheDocument();
});
