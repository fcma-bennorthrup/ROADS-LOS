import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ChecklistProvider } from "../../client/src/contexts/checklist-context";
import { LoanActivityProvider } from "../../client/src/contexts/loan-activity-context";
import { TooltipProvider } from "../../client/src/components/ui/tooltip";
import { queryClient } from "../../client/src/lib/queryClient";
import { loan } from "../summary/fixtures";
import Summary from "../../client/src/pages/loan-summary";
import Origination from "../../client/src/pages/loan-origination";
import Decisioning from "../../client/src/pages/loan-decisioning";
import Documents from "../../client/src/pages/loan-documents";
import Closing from "../../client/src/pages/loan-closing-booking";
import History from "../../client/src/pages/loan-history";
import ComingSoon from "../../client/src/pages/loan-coming-soon";

const NativeDate = Date;
window.Date = class extends NativeDate {
  constructor(...args: any[]) { super(args.length ? args[0] : "2026-10-14T16:00:00.000Z"); }
  static now() { return +new NativeDate("2026-10-14T16:00:00.000Z"); }
} as DateConstructor;
const deny = () => { throw new Error("FIXTURE_EXTERNAL_TRANSPORT_BLOCKED"); };
window.open = deny;
window.XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as any;
const [page, mode] = location.hash.slice(1).split("/");
window.fetch = async (url, init) => {
  if (url !== "/api/loans/synthetic" || init?.method) return deny();
  if (mode === "loading") return new Promise(() => {});
  return new Response(mode === "error" ? "synthetic error" : mode === "empty" ? "null" : JSON.stringify(loan),
    { status: mode === "error" ? 500 : 200 });
};
localStorage.clear();
const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
const route = memoryLocation({ path: "/loans/synthetic" });
const pages = { summary: Summary, origination: Origination, decisioning: Decisioning,
  documents: Documents, "closing-booking": Closing, history: History,
  "coming-soon": () => <ComingSoon tabName="Retained Page" /> };
const Page = pages[page as keyof typeof pages];
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}><Router hook={route.hook}>
    <TooltipProvider><LoanActivityProvider><ChecklistProvider>
      <Route path="/loans/:id"><Page /></Route>
    </ChecklistProvider></LoanActivityProvider></TooltipProvider>
  </Router></QueryClientProvider>,
);
setTimeout(() => { document.body.dataset.ready = "true"; }, 500);
