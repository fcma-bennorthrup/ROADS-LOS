import { createContext, useContext } from "react";
import type { useGitHubSync } from "@/hooks/use-github-sync";

export interface GitHubSyncContextValue {
  pullMutation: ReturnType<typeof useGitHubSync>["pullMutation"];
  pushMutation: ReturnType<typeof useGitHubSync>["pushMutation"];
  openConflictDialog: () => void;
  hasPendingConflicts: boolean;
}

export const GitHubSyncContext = createContext<GitHubSyncContextValue | null>(null);

export function useGitHubSyncContext(): GitHubSyncContextValue {
  const ctx = useContext(GitHubSyncContext);
  if (!ctx) throw new Error("useGitHubSyncContext must be used within GitHubSyncProvider");
  return ctx;
}
