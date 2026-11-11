import { createRoot } from "react-dom/client";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import PipelinePage from "@/pages/pipeline";
import { queryClient } from "@/lib/queryClient";
import "@/index.css";
import { GitHubSyncContext } from "@/contexts/github-sync-context";
import { BreadcrumbBar } from "@/components/AppHeader";
import { LoanPanelsFixture } from "./LoanPanelsFixture";
import { LoanScope } from "@/components/loan/LoanScope";
import { LoanWorkspace } from "@/components/loan/LoanWorkspace";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoanSummaryPage from "@/pages/loan-summary";
import LoanOriginationPage from "@/pages/loan-origination";
import LoanDecisioningPage from "@/pages/loan-decisioning";
import LoanClosingBookingPage from "@/pages/loan-closing-booking";
import LoanDocumentsPage from "@/pages/loan-documents";
import LoanHistoryPage from "@/pages/loan-history";

function WorkspaceRoutes() {
  return <Switch>
    <Route path="/pipeline" component={PipelinePage} />
    <Route path="/loans/:id" nest>
      <LoanScope><LoanWorkspace><Switch>
        <Route path="/origination" component={LoanOriginationPage} />
        <Route path="/decisioning" component={LoanDecisioningPage} />
        <Route path="/closing-booking" component={LoanClosingBookingPage} />
        <Route path="/documents" component={LoanDocumentsPage} />
        <Route path="/history" component={LoanHistoryPage} />
        <Route path="/" component={LoanSummaryPage} />
      </Switch></LoanWorkspace></LoanScope>
    </Route>
  </Switch>;
}

function LoanNavigationFixture() {
  return <div className="roads-loan-shell" data-testid="loan-layout-fixture">
    <BreadcrumbBar loanNumber="100000001" />
    <main><h1>Synthetic loan</h1><input aria-label="Unsaved example" defaultValue="Keep this text" /></main>
    <div className="roads-loan-bottom-toolbar">Loan toolbar</div>
  </div>;
}

function FixturePage() {
  // Keep the real closed panel mounted without enabling external sync activity.
  const mutation = useMutation({
    mutationFn: async (_options?: { force?: boolean }) => {
      throw new Error("GitHub sync is outside the layout fixture");
    },
  });
  return <GitHubSyncContext.Provider value={{
    pullMutation: mutation, pushMutation: mutation,
    hasPendingConflicts: false, openConflictDialog: () => {},
  }}>{new URLSearchParams(window.location.search).has("loanPanels") ? <LoanPanelsFixture /> : new URLSearchParams(window.location.search).has("loanNav") ? <LoanNavigationFixture /> : <WorkspaceRoutes />}</GitHubSyncContext.Provider>;
}

// The real page, providers and CSS; requests are isolated by Playwright.
// Refresh the real query without clicking through (or dismissing) an open modal.
window.addEventListener("fixture:refresh-pipeline", () => {
  void queryClient.refetchQueries({ queryKey: ["/api/loans"], exact: true });
});
const location = memoryLocation({ path: window.location.pathname === "/" ? "/pipeline" : window.location.pathname });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider><Router hook={location.hook}><FixturePage /></Router></TooltipProvider>
  </QueryClientProvider>,
);
