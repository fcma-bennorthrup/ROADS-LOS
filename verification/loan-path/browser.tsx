import React from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { LoanHeader, BottomToolbar } from "@/components/loan/LoanHeader";
import { LoanActivityPanel } from "@/components/loan/LoanActivityPanel";
import { CollateralContent } from "@/components/loan/CollateralContent";

const route = memoryLocation({ path: "/loans/synthetic-a/origination" });
const deny = () => { throw Error("EXTERNAL_OPERATION_BLOCKED"); };
window.fetch = deny;
window.open = deny;
XMLHttpRequest.prototype.open = deny;
localStorage.clear();
createRoot(document.getElementById("root")!).render(
  <Router hook={route.hook}><LoanActivityProvider><ChecklistProvider>
    <LoanHeader borrowerName="Synthetic Borrower" loanNumber="SYNTHETIC" />
    <CollateralContent borrowerName="Synthetic Borrower" loanNumber="SYNTHETIC" />
    <BottomToolbar /><LoanActivityPanel />
  </ChecklistProvider></LoanActivityProvider></Router>,
);
