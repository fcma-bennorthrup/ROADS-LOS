import { createRoot } from "react-dom/client";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import PipelinePage from "@/pages/pipeline";
import { queryClient } from "@/lib/queryClient";
import "@/index.css";
import { GitHubSyncContext } from "@/contexts/github-sync-context";
import { BreadcrumbBar } from "@/components/AppHeader";
import { LoanPanelsFixture } from "./LoanPanelsFixture";

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
  }}>{new URLSearchParams(window.location.search).has("loanPanels") ? <LoanPanelsFixture /> : new URLSearchParams(window.location.search).has("loanNav") ? <LoanNavigationFixture /> : <PipelinePage />}</GitHubSyncContext.Provider>;
}

// The real page, providers and CSS; requests are isolated by Playwright.
const location = memoryLocation({ path: "/pipeline" });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <Router hook={location.hook}><FixturePage /></Router>
  </QueryClientProvider>,
);
