import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoanSummaryPage from "@/pages/loan-summary";
import LoanOriginationPage from "@/pages/loan-origination";
import LoanDecisioningPage from "@/pages/loan-decisioning";
import LoanDocumentsPage from "@/pages/loan-documents";
import LoanClosingBookingPage from "@/pages/loan-closing-booking";
import LoanHistoryPage from "@/pages/loan-history";
import { Redirect } from "wouter";
import { ConflictResolutionDialog } from "@/components/ConflictResolutionDialog";
import { useGitHubSync } from "@/hooks/use-github-sync";
import { GitHubSyncContext } from "@/contexts/github-sync-context";
import { LoanScope } from "@/components/loan/LoanScope";
import { LoanWorkspace } from "@/components/loan/LoanWorkspace";
import PipelinePage from "@/pages/pipeline";

export { useGitHubSyncContext } from "@/contexts/github-sync-context";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/pipeline" />
      </Route>
      <Route path="/pipeline" component={PipelinePage} />
      <Route path="/loans/:id" nest>
        <LoanRoutes />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function LoanRoutes() {
  const [location] = useLocation();
  const path = location.length > 1 ? location.replace(/\/$/, "") : location;
  if (!["/", "/origination", "/decisioning", "/closing-booking", "/documents", "/history"].includes(path)) return <NotFound />;
  return <LoanScope><LoanWorkspace><Switch>
    <Route path="/origination" component={LoanOriginationPage} />
    <Route path="/decisioning" component={LoanDecisioningPage} />
    <Route path="/closing-booking" component={LoanClosingBookingPage} />
    <Route path="/documents" component={LoanDocumentsPage} />
    <Route path="/history" component={LoanHistoryPage} />
    <Route path="/" component={LoanSummaryPage} />
  </Switch></LoanWorkspace></LoanScope>;
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
