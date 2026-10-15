import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ConflictResolutionDialog } from "@/components/ConflictResolutionDialog";
import { GitHubSyncPanel } from "@/components/GitHubSyncPanel";
import { GitHubSyncContext } from "@/contexts/github-sync-context";
import { Toaster } from "@/components/ui/toaster";
import { useGitHubSync } from "@/hooks/use-github-sync";

const mode = new URLSearchParams(location.search).get("mode") || "conflict";
const data = {
  planId: "reviewed-plan", hasConflicts: true, operation: "push" as const,
  remoteHeadSha: "head", conflicts: [
    { path: "synthetic/a.txt", reason: "Both modified", localContent: "ours\nline 2", remoteContent: "theirs\nline 2", baseContent: "base" },
    { path: "synthetic/b.txt", reason: "Both modified",
      localContent: Array.from({ length: 60 }, (_, i) => `local row ${i}`).join("\n"),
      remoteContent: Array.from({ length: 62 }, (_, i) => `remote row ${i}`).join("\n"), baseContent: "base" },
  ],
};
const status = { lastSyncedCommitSha: "base", remoteHeadSha: "head", inSync: true,
  remoteHasChanges: false, hasLocalChanges: false, localChangedCount: 0,
  localDeletedCount: 0, localCheckFailed: false,
  ...(mode === "panel-error" ? { inSync: false, recovery: {
    message: "Sync incomplete. The checkpoint was not advanced. Some changes may already have been applied. Review the result before retrying.",
    operation: "pull", outcomes: [{ path: "a.txt", action: "write", state: "completed" },
      { path: "b.txt", action: "write", state: "failed" }],
  } } : {}),
};
const fixture = (window as any).fixture = {
  requests: [] as any[], response: "stale", release: undefined as (() => void) | undefined,
  replacePlan: undefined as (() => void) | undefined, closed: false,
};
const deny = () => { throw Error("EXTERNAL_OPERATION_BLOCKED"); };
window.open = deny;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as any;
window.fetch = (async (url: string, options: RequestInit = {}) => {
  fixture.requests.push({ url, body: options.body ? JSON.parse(String(options.body)) : null });
  if (url === "/api/github/conflicts" && !options.method) return new Response(JSON.stringify({ hasConflicts: false, conflicts: [], operation: null }));
  if (url === "/api/github/sync-status") return new Response(JSON.stringify(status));
  if (["/api/github/push", "/api/github/pull"].includes(url)) {
    if (fixture.response === "conflicts") return new Response(JSON.stringify({ ...data, commitSha: "head", message: "Conflicts detected" }), { status: 409 });
    return new Response(JSON.stringify({ error: "Another sync operation is in progress. Wait for it to finish, then retry." }), { status: 409 });
  }
  if (url !== "/api/github/resolve-conflicts") deny();
  await new Promise<void>(resolve => { fixture.release = resolve; });
  if (fixture.response === "success") return new Response(JSON.stringify({ message: "Resolved 2 conflicts", operation: "push" }));
  return new Response(JSON.stringify({ error: "Sync state has changed since this plan was created. No files were changed. Run sync again before resolving conflicts." }), { status: 409 });
}) as typeof fetch;
queryClient.setQueryData(["/api/github/conflicts"], { hasConflicts: false, conflicts: [], operation: null });
queryClient.setQueryData(["/api/github/sync-status"], status);
function Fixture() {
  const sync = useGitHubSync();
  const [plan, setPlan] = useState(data);
  fixture.replacePlan = () => setPlan({ ...data, planId: "replacement-plan" });
  if (mode.startsWith("panel")) return <GitHubSyncContext.Provider value={sync}>
    <GitHubSyncPanel open onOpenChange={() => {}} />
  </GitHubSyncContext.Provider>;
  if (mode === "flow") return <>
    <button data-testid="probe-push" onClick={() => sync.pushMutation.mutate({})}>Push fixture</button>
    <button data-testid="probe-pull" onClick={() => sync.pullMutation.mutate({})}>Pull fixture</button>
    <ConflictResolutionDialog open={sync.conflictDialogOpen} onOpenChange={sync.setConflictDialogOpen} conflictsData={sync.conflictsData} />
  </>;
  return <ConflictResolutionDialog open onOpenChange={() => { fixture.closed = true; }} conflictsData={plan} />;
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}><Fixture /><Toaster /></QueryClientProvider>,
);
