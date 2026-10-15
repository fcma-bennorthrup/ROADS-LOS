import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import LoanDecisioningPage from "@/pages/loan-decisioning";
import { queryClient } from "@/lib/queryClient";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { Toaster } from "@/components/ui/toaster";

const deny = () => { throw new Error("EXTERNAL_OPERATION_BLOCKED"); };
const NativeDate = Date;
class FixedDate extends NativeDate {
  constructor(value?: string | number) { super(value ?? "2026-10-14T16:00:00.000Z"); }
  static now() { return 1791993600000; }
}
Object.defineProperty(window, "Date", { value: FixedDate });
const opens: unknown[] = [];
window.open = (...args) => { opens.push(args); return null; };
window.WebSocket = class { constructor() { deny(); } } as unknown as typeof WebSocket;
XMLHttpRequest.prototype.open = deny;
window.fetch = async (input, init) => {
  if (!["/api/loans/fixture-a", "/api/loans/fixture-b"].includes(String(input)) || init?.credentials !== "include") return deny();
  return new Response(JSON.stringify({
    id: "fixture-a", loanNumber: "FIXTURE-001", cifNumber: "FIXTURE-CIF",
    loanType: "Construction", primaryBorrowerName: "Synthetic Borrower",
    displayAmount: "1200.25", applicationType: "Joint Credit Application",
    ecoaDaysRemaining: 14, tridDaysRemaining: 3, borrowers: [],
  }));
};
if (new URLSearchParams(location.search).has("fresh")) localStorage.clear();
const route = memoryLocation({ path: "/loans/fixture-a/decisioning" });
Object.assign(window, { fixture: { navigate: route.navigate, opens } });
const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
createRoot(document.getElementById("root")!).render(
  <Router hook={route.hook}><QueryClientProvider client={client}>
    <LoanActivityProvider><ChecklistProvider>
      <Route path="/loans/:id/decisioning"><LoanDecisioningPage /></Route>
      <Route path="/loans/:id/history"><div data-testid="away">Away</div></Route>
    </ChecklistProvider></LoanActivityProvider><Toaster />
  </QueryClientProvider></Router>,
);
