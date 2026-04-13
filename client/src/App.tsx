import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoanSummaryPage from "@/pages/loan-summary";
import LoanOriginationPage from "@/pages/loan-origination";
import LoanDecisioningPage from "@/pages/loan-decisioning";
import { Redirect } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/loans/1" />
      </Route>
      <Route path="/loans/:id/origination" component={LoanOriginationPage} />
      <Route path="/loans/:id/decisioning" component={LoanDecisioningPage} />
      <Route path="/loans/:id" component={LoanSummaryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
