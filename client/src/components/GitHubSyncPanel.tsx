import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useGitHubSyncContext } from "@/contexts/github-sync-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  GitBranch,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface SyncStatus {
  lastSyncedCommitSha: string | null;
  remoteHeadSha: string;
  inSync: boolean;
}

export function GitHubSyncPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pullMutation, pushMutation, openConflictDialog, hasPendingConflicts } =
    useGitHubSyncContext();
  const [commitMessage, setCommitMessage] = useState("Update from Replit");

  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: ["/api/github/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/github/conflicts"] });
    }
  }, [open]);

  const { data: syncStatus, isLoading: statusLoading } = useQuery<SyncStatus>({
    queryKey: ["/api/github/sync-status"],
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            GitHub Sync
          </DialogTitle>
          <DialogDescription>
            Sync your project with GitHub. Pull remote changes or push local
            changes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {statusLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking sync status...
            </div>
          ) : syncStatus ? (
            <div className="flex items-center gap-2 text-sm" data-testid="text-sync-status">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              {syncStatus.inSync ? (
                <span className="text-muted-foreground">In sync with remote</span>
              ) : (
                <span>Remote has newer changes</span>
              )}
            </div>
          ) : null}

          {hasPendingConflicts && (
            <div className="flex items-center justify-between gap-2 p-3 border rounded-md bg-destructive/5">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Unresolved conflicts pending</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  openConflictDialog();
                  onOpenChange(false);
                }}
                data-testid="button-open-conflict-resolver"
              >
                Resolve
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => pullMutation.mutate()}
                disabled={pullMutation.isPending || pushMutation.isPending}
                data-testid="button-pull"
              >
                {pullMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-2" />
                )}
                Pull
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => pullMutation.mutate({ force: true })}
                disabled={pullMutation.isPending || pushMutation.isPending}
                data-testid="button-force-pull"
              >
                Force Pull
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Input
                placeholder="Commit message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                data-testid="input-commit-message"
              />
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1"
                  onClick={() => pushMutation.mutate({ message: commitMessage })}
                  disabled={pullMutation.isPending || pushMutation.isPending}
                  data-testid="button-push"
                >
                  {pushMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4 mr-2" />
                  )}
                  Push
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() =>
                    pushMutation.mutate({ message: commitMessage, force: true })
                  }
                  disabled={pullMutation.isPending || pushMutation.isPending}
                  data-testid="button-force-push"
                >
                  Force Push
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-sync-panel"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
