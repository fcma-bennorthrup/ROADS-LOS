import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConflictFile {
  path: string;
  reason: string;
  localContent: string | null;
  remoteContent: string | null;
  baseContent: string | null;
}

interface ConflictsResponse {
  hasConflicts: boolean;
  operation: "push" | "pull" | null;
  remoteHeadSha?: string;
  commitMessage?: string | null;
  createdAt?: string;
  conflicts: ConflictFile[];
}

interface SyncResponse {
  commitSha: string;
  message: string;
  hasConflicts?: boolean;
  conflicts?: ConflictFile[];
  [key: string]: any;
}

export function useGitHubSync() {
  const { toast } = useToast();
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictsData, setConflictsData] = useState<ConflictsResponse | null>(
    null
  );

  const pendingConflictsQuery = useQuery<ConflictsResponse>({
    queryKey: ["/api/github/conflicts"],
    refetchInterval: false,
  });

  const handleConflictResponse = useCallback(
    (response: SyncResponse, operation: "push" | "pull") => {
      if (response.hasConflicts && response.conflicts && response.conflicts.length > 0) {
        setConflictsData({
          hasConflicts: true,
          operation,
          remoteHeadSha: response.commitSha,
          conflicts: response.conflicts,
        });
        setConflictDialogOpen(true);
        toast({
          title: "Conflicts Detected",
          description: `${response.conflicts.length} file(s) have conflicts that need resolution.`,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const pullMutation = useMutation({
    mutationFn: async (options?: { force?: boolean }) => {
      const res = await fetch("/api/github/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: options?.force ?? false }),
        credentials: "include",
      });
      const body = (await res.json()) as SyncResponse;
      if (res.status === 409) {
        return body;
      }
      if (!res.ok) {
        throw new Error(body.message || body.error || `Pull failed (${res.status})`);
      }
      return body;
    },
    onSuccess: (result) => {
      if (result.hasConflicts) {
        handleConflictResponse(result, "pull");
      } else {
        toast({ title: "Pull Complete", description: result.message });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/github/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/github/conflicts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Pull Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async (options?: { message?: string; force?: boolean }) => {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: options?.message || "Update from Replit",
          force: options?.force ?? false,
        }),
        credentials: "include",
      });
      const body = (await res.json()) as SyncResponse;
      if (res.status === 409) {
        return body;
      }
      if (!res.ok) {
        throw new Error(body.message || body.error || `Push failed (${res.status})`);
      }
      return body;
    },
    onSuccess: (result) => {
      if (result.hasConflicts) {
        handleConflictResponse(result, "push");
      } else {
        toast({ title: "Push Complete", description: result.message });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/github/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/github/conflicts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Push Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openConflictDialog = useCallback(() => {
    setConflictsData(null);
    setConflictDialogOpen(true);
  }, []);

  const closeConflictDialog = useCallback(() => {
    setConflictDialogOpen(false);
    setConflictsData(null);
  }, []);

  return {
    pullMutation,
    pushMutation,
    conflictDialogOpen,
    setConflictDialogOpen,
    conflictsData,
    openConflictDialog,
    closeConflictDialog,
    hasPendingConflicts: pendingConflictsQuery.data?.hasConflicts ?? false,
  };
}
