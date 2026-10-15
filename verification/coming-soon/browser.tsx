import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ChecklistProvider } from "../../client/src/contexts/checklist-context";
import { LoanActivityProvider } from "../../client/src/contexts/loan-activity-context";
import { queryClient } from "../../client/src/lib/queryClient";
import Page from "../../client/src/pages/loan-coming-soon";

// Compiled only into a disposable file:// fixture, never into the application.
const NativeDate = Date;
class FixedDate extends NativeDate {
  constructor(...args: any[]) {
    if (args.length) super(args[0]); else super("2026-10-14T16:00:00.000Z");
  }
  static now() { return +new NativeDate("2026-10-14T16:00:00.000Z"); }
}
window.Date = FixedDate as DateConstructor;
const deny = () => { throw new Error("FIXTURE_EXTERNAL_TRANSPORT_BLOCKED"); };
window.open = deny;
window.XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as any;
const mode = location.hash.slice(1) || "success";
const loan = {
  id: "fixture-a", loanNumber: "TEST-A", cifNumber: "TEST-CIF", loanType: "Synthetic",
  primaryBorrowerName: "Synthetic Borrower", displayAmount: "1234.50",
  applicationType: "Synthetic Application", ecoaDaysRemaining: 9, tridDaysRemaining: 2,
  borrowers: [],
};
window.fetch = async (url, init) => {
  if (url !== "/api/loans/fixture-a" || init?.method) return deny();
  if (mode === "loading") return new Promise(() => {});
  return new Response(mode === "error" ? "synthetic error" : JSON.stringify(loan),
    { status: mode === "error" ? 500 : 200 });
};
localStorage.clear();
const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
const route = memoryLocation({ path: "/loans/fixture-a" });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}><Router hook={route.hook}>
    <LoanActivityProvider><ChecklistProvider>
      <Route path="/loans/:id"><Page tabName={mode === "long" ? "Long placeholder title ".repeat(18) : "Summary"} /></Route>
    </ChecklistProvider></LoanActivityProvider>
  </Router></QueryClientProvider>,
);
setTimeout(() => {
  if (mode === "checklist") {
    document.querySelector<HTMLButtonElement>('[data-testid="toolbar-checklist"]')!.click();
    setTimeout(() => document.querySelector<HTMLButtonElement>('[data-testid="button-expand-task-0"]')!.click(), 50);
  }
  if (mode === "focus") document.querySelector<HTMLButtonElement>('[data-testid="toolbar-checklist"]')!.focus();
}, 200);
setTimeout(() => {
  const heading = document.querySelector("h2");
  const panel = document.querySelector('[data-testid="checklist-panel"]');
  const content = document.querySelector('[data-testid="loan-summary-page"]')?.children[1];
  const data = {
    mode, viewport: [innerWidth, innerHeight], text: document.getElementById("root")!.textContent,
    fontStatus: "external fonts blocked; existing CSS font stack unchanged",
    heading: heading ? { font: getComputedStyle(heading).font, color: getComputedStyle(heading).color } : null,
    reserve: content ? getComputedStyle(content).paddingBottom : null,
    panel: panel ? { height: panel.getBoundingClientRect().height, maxHeight: getComputedStyle(panel).maxHeight } : null,
    focus: document.activeElement?.getAttribute("data-testid"),
    documentSize: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
  };
  const evidence = document.createElement("script");
  evidence.type = "application/json"; evidence.id = "fixture-evidence";
  evidence.textContent = JSON.stringify(data); document.body.appendChild(evidence);
}, 600);
