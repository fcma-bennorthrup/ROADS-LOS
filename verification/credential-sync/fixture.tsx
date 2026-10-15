// This fixture mounts only sync UI with synthetic responses, never the live App.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../client/src/lib/queryClient";
import { useGitHubSync } from "../../client/src/hooks/use-github-sync";
import { GitHubSyncContext } from "../../client/src/contexts/github-sync-context";
import { GitHubSyncPanel } from "../../client/src/components/GitHubSyncPanel";
import { ConflictResolutionDialog } from "../../client/src/components/ConflictResolutionDialog";
import { Toaster } from "../../client/src/components/ui/toaster";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "blocked";
const calls: { method: string; url: string }[] = [];
(window as any).fixtureCalls = calls;
const message = mode === "eligibility"
  ? "Pending conflicts contain files incompatible with the sync eligibility policy. Cancel these conflicts, then retry the sync."
  : "Pending conflicts contain files excluded by the sync security policy. Cancel these conflicts, then retry the sync.";
let cleared = false;
window.fetch = async (url, options) => {
  const method = options?.method ?? "GET";
  calls.push({ method, url: String(url) });
  if (url === "/api/github/conflicts" && method === "DELETE") {
    if (mode === "cancel-error") return new Response("Synthetic cancellation failure", { status: 500 });
    cleared = true;
    return Response.json({ message: "Pending conflicts cleared" });
  }
  if (url === "/api/github/conflicts" && method === "GET") {
    if (mode === "loading") return new Promise<Response>(() => {});
    if (cleared || ["empty", "binary-error", "read-error", "oversized"].includes(mode)) return Response.json({ hasConflicts: false, operation: null, conflicts: [] });
    if (mode === "normal") return Response.json({
      hasConflicts: true, operation: "push", conflicts: [{
        path: "safe.ts", localContent: "local\nsafe", remoteContent: "remote\nsafe",
        baseContent: "base\nsafe", reason: "Modified both locally and remotely since last sync",
      }],
    });
    return Response.json({ hasConflicts: true, operation: "push", conflicts: [], blockedReason: message });
  }
  if (url === "/api/github/sync-status") return Response.json({
    lastSyncedCommitSha: "base", remoteHeadSha: "base", inSync: false,
    remoteHasChanges: false, hasLocalChanges: true, localChangedCount: 2,
    localDeletedCount: 1, localCheckFailed: false,
  });
  if (url === "/api/github/resolve-conflicts" && mode === "normal")
    return Response.json({ message: "Synthetic safe conflict resolved" });
  if (url === "/api/github/pull" || url === "/api/github/push") {
    if (mode === "binary-error") return Response.json({
      error: "Sync blocked: 1 binary file(s) need manual reconciliation. No files were changed. Reconcile these files outside the text conflict editor, then retry.",
    }, { status: 500 });
    if (mode === "read-error") return Response.json({
      error: "Sync blocked: could not read 1 file(s). No files were changed. Fix the read errors and retry.",
    }, { status: 500 });
    return Response.json({ message: "Pulled 0 files, deleted 0 from fcma-bennorthrup/ROADS-LOS Skipped 1 file(s) larger than 7 MiB; existing copies were preserved." });
  }
  throw new Error("FIXTURE_TRANSPORT_BLOCKED");
};
window.open = () => { throw new Error("FIXTURE_WINDOW_OPEN_BLOCKED"); };
function Fixture() {
  const sync = useGitHubSync();
  const [panelOpen, setPanelOpen] = useState(params.get("screen") !== "dialog");
  useEffect(() => {
    if (params.get("screen") === "dialog") sync.setConflictDialogOpen(true);
  }, []);
  return (
    <GitHubSyncContext.Provider value={sync}>
      <GitHubSyncPanel open={panelOpen} onOpenChange={setPanelOpen} />
      <ConflictResolutionDialog
        open={sync.conflictDialogOpen}
        onOpenChange={sync.setConflictDialogOpen}
        conflictsData={sync.conflictsData}
      />
      {!panelOpen && !sync.conflictDialogOpen && (
        <button onClick={() => setPanelOpen(true)}>Open Sync Panel</button>
      )}
      <Toaster />
    </GitHubSyncContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}><Fixture /></QueryClientProvider>,
);
