import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { queryClient } from "../../client/src/lib/queryClient";
import { ChecklistProvider } from "../../client/src/contexts/checklist-context";
import { LoanActivityProvider } from "../../client/src/contexts/loan-activity-context";
import { GitHubSyncContext } from "../../client/src/contexts/github-sync-context";
import { TooltipProvider } from "../../client/src/components/ui/tooltip";
import { Toaster } from "../../client/src/components/ui/toaster";
import LoanDocumentsPage from "../../client/src/pages/loan-documents";

export const FIXED_TIME = "2026-10-14T16:00:00.000Z";
export const record = { id: 1, generatedAt: "2026-10-05T12:00:00.000Z", deliveredAt: null };
export const loan = (id: string, empty = false) => ({
  id, loanNumber: `FIXTURE-${id}`, cifNumber: "FIXTURE-CIF", loanType: "Home Equity",
  primaryBorrowerName: "Synthetic Borrower A", displayAmount: "100000",
  applicationType: "Individual", ecoaDaysRemaining: 20, tridDaysRemaining: 3,
  borrowers: empty ? [] : [
    { id: "a", loanId: id, name: "Synthetic Borrower A", isPrimary: true, email: "a@example.invalid", phone: "" },
    { id: "b", loanId: id, name: "Synthetic Borrower B", isPrimary: false, email: "b@example.invalid", phone: "" },
  ],
});
const denied = () => { throw new Error("DOCUMENTS_FIXTURE_EXTERNAL_OPERATION_BLOCKED"); };
// Deliberately inert context, never useGitHubSync or the live App.
const sync = {
  pullMutation: { mutate: denied, isPending: false },
  pushMutation: { mutate: denied, isPending: false },
  openConflictDialog: denied, hasPendingConflicts: false,
} as unknown as React.ContextType<typeof GitHubSyncContext>;

export function DocumentsFixture() {
  return <QueryClientProvider client={queryClient}><TooltipProvider>
    <GitHubSyncContext.Provider value={sync}>
      <LoanActivityProvider><ChecklistProvider>
        <Switch>
          <Route path="/loans/:id/documents" component={LoanDocumentsPage} />
          <Route><div data-testid="fixture-away">Synthetic route away</div></Route>
        </Switch>
      </ChecklistProvider></LoanActivityProvider>
      <Toaster />
    </GitHubSyncContext.Provider>
  </TooltipProvider></QueryClientProvider>;
}

export function RoutedDocumentsFixture({ hook }: { hook?: React.ComponentProps<typeof Router>["hook"] }) {
  return <Router hook={hook}><DocumentsFixture /></Router>;
}
