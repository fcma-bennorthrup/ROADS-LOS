import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import LoanDecisioningPage from "@/pages/loan-decisioning";
import { queryClient } from "@/lib/queryClient";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { ChecklistProvider } from "@/contexts/checklist-context";

const deny = () => { throw new Error("FIXTURE_EXTERNAL_OPERATION_BLOCKED"); };
const NativeDate = Date;
class FixedDate extends NativeDate {
  constructor(value?: string | number) { super(value ?? "2026-10-14T16:00:00.000Z"); }
  static now() { return 1791993600000; }
}
Object.defineProperty(window, "Date", { value: FixedDate });
window.open = deny;
window.WebSocket = class { constructor() { deny(); } } as unknown as typeof WebSocket;
XMLHttpRequest.prototype.open = deny;
window.fetch = async (input, init) => {
  if (input !== "/api/loans/fixture-a" || init?.credentials !== "include") return deny();
  return new Response(JSON.stringify({
    id: "fixture-a", loanNumber: "FIXTURE-001", cifNumber: "FIXTURE-CIF",
    loanType: "Construction", primaryBorrowerName: "Synthetic Borrower",
    displayAmount: "1200.25", applicationType: "Joint Credit Application",
    ecoaDaysRemaining: 14, tridDaysRemaining: 3, borrowers: [],
  }));
};
localStorage.clear();
const location = memoryLocation({ path: "/loans/fixture-a/decisioning" });
const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
createRoot(document.getElementById("root")!).render(
  <Router hook={location.hook}><QueryClientProvider client={client}>
    <LoanActivityProvider><ChecklistProvider>
      <Route path="/loans/:id/decisioning"><LoanDecisioningPage /></Route>
    </ChecklistProvider></LoanActivityProvider>
  </QueryClientProvider></Router>,
);
