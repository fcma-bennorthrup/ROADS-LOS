import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoanSummaryPage from "@/pages/loan-summary";
import LoanOriginationPage from "@/pages/loan-origination";
import LoanDecisioningPage from "@/pages/loan-decisioning";
import LoanDocumentsPage from "@/pages/loan-documents";
import LoanComingSoonPage from "@/pages/loan-coming-soon";
import LoanHistoryPage from "@/pages/loan-history";
import { Redirect } from "wouter";
import { ConflictResolutionDialog } from "@/components/ConflictResolutionDialog";
import { useGitHubSync } from "@/hooks/use-github-sync";
import { GitHubSyncContext } from "@/contexts/github-sync-context";

export { useGitHubSyncContext } from "@/contexts/github-sync-context";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/loans/1" />
      </Route>
      <Route path="/loans/:id/origination" component={LoanOriginationPage} />
      <Route path="/loans/:id/decisioning" component={LoanDecisioningPage} />
      <Route path="/loans/:id/closing-booking">{() => <LoanComingSoonPage tabName="Closing & Booking" />}</Route>
      <Route path="/loans/:id/documents" component={LoanDocumentsPage} />
      <Route path="/loans/:id/history" component={LoanHistoryPage} />
      <Route path="/loans/:id" component={LoanSummaryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const sync = useGitHubSync();

  return (
    <GitHubSyncContext.Provider
      value={{
        pullMutation: sync.pullMutation,
        pushMutation: sync.pushMutation,
        openConflictDialog: sync.openConflictDialog,
        hasPendingConflicts: sync.hasPendingConflicts,
      }}
    >
      <Router />
      <ConflictResolutionDialog
        open={sync.conflictDialogOpen}
        onOpenChange={sync.setConflictDialogOpen}
        conflictsData={sync.conflictsData}
      />
    </GitHubSyncContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
