// Isolated entry: never import App, server code, sync hooks or application main.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Route } from "wouter";
import LoanSummaryPage from "../../client/src/pages/loan-summary";
import { LoanActivityProvider } from "../../client/src/contexts/loan-activity-context";
import { ChecklistProvider } from "../../client/src/contexts/checklist-context";
import { GitHubSyncContext } from "../../client/src/contexts/github-sync-context";
import { TooltipProvider } from "../../client/src/components/ui/tooltip";
import { Toaster } from "../../client/src/components/ui/toaster";
import { queryClient } from "../../client/src/lib/queryClient";
import { loan } from "./fixtures";

const scenario = new URLSearchParams(location.search);
const deny = () => { throw new Error("SUMMARY_EXTERNAL_OPERATION_BLOCKED"); };
const NativeDate = Date;
class FixedDate extends NativeDate {
  constructor(...args: ConstructorParameters<typeof Date>) {
    super(...(args.length ? args : ["2026-10-14T16:00:00.000Z"]) as ConstructorParameters<typeof Date>);
  }
  static now() { return 1791993600000; }
}
window.Date = FixedDate as DateConstructor;
localStorage.clear();
sessionStorage.clear();
window.open = deny;
window.confirm = () => false;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as unknown as typeof WebSocket;
navigator.sendBeacon = deny;
const record = {
  requests: [] as { url: string; credentials?: RequestCredentials }[],
  copies: [] as string[], pendingCopies: [] as { resolve: () => void; reject: () => void }[],
};
Object.assign(window, { summaryEvidence: record });
window.fetch = async (input, init) => {
  const url = String(input);
  record.requests.push({ url, credentials: init?.credentials });
  if (!/^\/api\/loans\/(synthetic|alternate|1)$/.test(url)) return deny();
  switch (scenario.get("state")) {
    case "pending": return new Promise<Response>(() => {});
    case "error": return new Response("Synthetic failure", { status: 500 });
    case "empty": return new Response("null", { status: 200 });
    default: return new Response(JSON.stringify({
      ...loan,
      borrowers: scenario.get("borrowers") === "zero" ? [] : loan.borrowers,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
};
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: scenario.get("clipboard") === "unavailable" ? undefined : {
    writeText: (text: string) => {
      record.copies.push(text);
      if (scenario.get("clipboard") === "reject") return Promise.reject(new Error("Synthetic denial"));
      if (scenario.get("clipboard") === "deferred") return new Promise<void>((resolve, reject) => {
        record.pendingCopies.push({ resolve, reject: () => reject(new Error("Synthetic denial")) });
      });
      return Promise.resolve();
    },
  },
});
if (!location.pathname.startsWith("/loans/")) history.replaceState({}, "", `/loans/synthetic${location.search}`);

function Fixture() {
  const pullMutation = useMutation({ mutationFn: async (_?: { force?: boolean }) => deny() });
  const pushMutation = useMutation({ mutationFn: async (_: { message?: string; force?: boolean }) => deny() });
  // Deliberately inert adapter: no sync hook or connector ever mounts.
  const sync = { pullMutation, pushMutation, openConflictDialog: deny, hasPendingConflicts: false };
  return <GitHubSyncContext.Provider value={sync as unknown as React.ContextType<typeof GitHubSyncContext>}>
    <TooltipProvider><LoanActivityProvider><ChecklistProvider>
      <Route path="/loans/:id"><LoanSummaryPage /></Route>
      <Toaster />
    </ChecklistProvider></LoanActivityProvider></TooltipProvider>
  </GitHubSyncContext.Provider>;
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}><Fixture /></QueryClientProvider>,
);
