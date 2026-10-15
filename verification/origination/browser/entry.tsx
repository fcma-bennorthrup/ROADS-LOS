import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "wouter";
import LoanOriginationPage from "@/pages/loan-origination";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import "@/index.css";

const client = new QueryClient({ defaultOptions: { queries: {
  retry: false, staleTime: Infinity, refetchOnWindowFocus: false,
  queryFn: () => { throw new Error("UNEXPECTED_QUERY"); },
} } });
client.setQueryData(["/api/loans", "synthetic-a"], {
  id: "synthetic-a", loanNumber: "TEST-001", cifNumber: "TEST-CIF", loanType: "Land",
  primaryBorrowerName: "Synthetic Borrower", displayAmount: "1234.50",
  amountRequested: "9876.50", applicationType: "Individual",
  ecoaDaysRemaining: 7, tridDaysRemaining: 3, borrowers: [],
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}><LoanActivityProvider><ChecklistProvider>
    <Route path="/loans/:id/origination"><LoanOriginationPage /></Route>
  </ChecklistProvider></LoanActivityProvider></QueryClientProvider>,
);
