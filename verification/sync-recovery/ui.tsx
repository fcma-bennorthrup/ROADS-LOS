import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { GitHubSyncContext } from "@/contexts/github-sync-context";
import { GitHubSyncPanel } from "@/components/GitHubSyncPanel";
const failed = location.search === "?failure";
const status = { lastSyncedCommitSha: "base", remoteHeadSha: "head",
  inSync: !failed, remoteHasChanges: failed, hasLocalChanges: false,
  localChangedCount: 0, localDeletedCount: 0, localCheckFailed: false,
  ...(failed ? { recovery: {
    message: "Sync incomplete. The checkpoint was not advanced. Some changes may already have been applied. Review the result before retrying.",
    operation: "pull", outcomes: [
      { path: "a.txt", action: "write", state: "completed" },
      { path: "b.txt", action: "write", state: "failed" },
    ],
  } } : {}),
};
const deny = () => { throw Error("EXTERNAL_OPERATION_BLOCKED"); };
window.fetch = deny;
window.open = deny;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as any;
queryClient.setDefaultOptions({ queries: { queryFn: async () => status, retry: false, staleTime: Infinity } });
queryClient.setQueryData(["/api/github/sync-status"], status);
const mutation = { isPending: false, mutate: deny } as any;
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <GitHubSyncContext.Provider value={{ pullMutation: mutation, pushMutation: mutation,
      hasPendingConflicts: false, openConflictDialog: deny }}>
      <GitHubSyncPanel open onOpenChange={() => {}} />
    </GitHubSyncContext.Provider>
  </QueryClientProvider>,
);
