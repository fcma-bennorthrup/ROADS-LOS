import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { GitHubSyncContext, type GitHubSyncContextValue } from "@/contexts/github-sync-context";
import { queryClient } from "@/lib/queryClient";
import LoanClosingBookingPage from "@/pages/loan-closing-booking";
import "@/index.css";

// Never import App or any server module. Every application transport is denied.
const deny = () => { throw new Error("ISOLATED_FIXTURE_EXTERNAL_OPERATION_BLOCKED"); };
window.fetch = deny;
window.open = deny;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as typeof WebSocket;
window.EventSource = class { constructor() { deny(); } } as typeof EventSource;
navigator.sendBeacon = deny;
localStorage.clear();
sessionStorage.clear();

const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
client.setQueryData(["/api/loans", "fixture-a"], {
  id: "fixture-a", loanNumber: "SYNTHETIC-A", cifNumber: "SYNTHETIC-CIF",
  loanType: "Fixture Loan", primaryBorrowerName: "Synthetic Borrower",
  displayAmount: "1234.56", applicationType: "Individual",
  ecoaDaysRemaining: 20, tridDaysRemaining: 3, borrowers: [],
});
const location = memoryLocation({ path: "/loans/fixture-a/closing-booking" });

function InertAdmin({ children }: { children: React.ReactNode }) {
  type Pull = GitHubSyncContextValue["pullMutation"];
  type Push = GitHubSyncContextValue["pushMutation"];
  const mutationFn = async (): Promise<NonNullable<Pull["data"]>> => deny();
  const pullMutation = useMutation<NonNullable<Pull["data"]>, Error, Parameters<Pull["mutate"]>[0]>({ mutationFn });
  const pushMutation = useMutation<NonNullable<Push["data"]>, Error, Parameters<Push["mutate"]>[0]>({ mutationFn });
  return <GitHubSyncContext.Provider value={{
    pullMutation, pushMutation, hasPendingConflicts: false, openConflictDialog: deny,
  }}>{children}</GitHubSyncContext.Provider>;
}

createRoot(document.getElementById("root")!).render(
  <Router hook={location.hook}>
    <QueryClientProvider client={client}>
      <InertAdmin><LoanActivityProvider><ChecklistProvider>
        <Route path="/loans/:id/closing-booking" component={LoanClosingBookingPage} />
      </ChecklistProvider></LoanActivityProvider></InertAdmin>
    </QueryClientProvider>
  </Router>,
);
