import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Check,
  FileText,
  GitMerge,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Trash2,
} from "lucide-react";

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

type ResolutionChoice = "local" | "remote" | "manual" | "delete";

interface FileResolution {
  choice: ResolutionChoice;
  content: string | null;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictsData?: ConflictsResponse | null;
}

function DiffViewer({
  localContent,
  remoteContent,
}: {
  localContent: string | null;
  remoteContent: string | null;
}) {
  const localLines = (localContent || "").split("\n");
  const remoteLines = (remoteContent || "").split("\n");
  const maxLines = Math.max(localLines.length, remoteLines.length);

  const diffRows = useMemo(() => {
    const rows: Array<{
      lineNum: number;
      local: string;
      remote: string;
      changed: boolean;
    }> = [];
    for (let i = 0; i < maxLines; i++) {
      const local = localLines[i] ?? "";
      const remote = remoteLines[i] ?? "";
      rows.push({
        lineNum: i + 1,
        local,
        remote,
        changed: local !== remote,
      });
    }
    return rows;
  }, [localLines, remoteLines, maxLines]);

  return (
    <div className="border rounded-md overflow-auto text-xs font-mono">
      <div className="flex border-b sticky top-0 bg-muted z-10">
        <div className="flex-1 p-2 font-semibold text-muted-foreground border-r">
          Local (yours)
        </div>
        <div className="flex-1 p-2 font-semibold text-muted-foreground">
          Remote (theirs)
        </div>
      </div>
      <div className="max-h-80 overflow-auto">
        {diffRows.map((row) => (
          <div
            key={row.lineNum}
            className={`flex border-b last:border-b-0 ${
              row.changed
                ? "bg-destructive/5 dark:bg-destructive/10"
                : ""
            }`}
          >
            <div className="w-8 shrink-0 text-right pr-1 text-muted-foreground select-none border-r bg-muted/50">
              {row.lineNum}
            </div>
            <div
              className={`flex-1 px-2 py-0.5 whitespace-pre border-r overflow-hidden ${
                row.changed
                  ? "bg-red-50 dark:bg-red-950/30"
                  : ""
              }`}
            >
              {row.local}
            </div>
            <div className="w-8 shrink-0 text-right pr-1 text-muted-foreground select-none border-r bg-muted/50">
              {row.lineNum}
            </div>
            <div
              className={`flex-1 px-2 py-0.5 whitespace-pre overflow-hidden ${
                row.changed
                  ? "bg-green-50 dark:bg-green-950/30"
                  : ""
              }`}
            >
              {row.remote}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflictsData: externalData,
}: ConflictResolutionDialogProps) {
  const { toast } = useToast();
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [resolutions, setResolutions] = useState<
    Record<string, FileResolution>
  >({});
  const [manualContent, setManualContent] = useState<Record<string, string>>(
    {}
  );

  const { data: fetchedData, isLoading } = useQuery<ConflictsResponse>({
    queryKey: ["/api/github/conflicts"],
    enabled: open && !externalData,
  });

  const data = externalData || fetchedData;
  const conflicts = data?.conflicts || [];
  const operation = data?.operation;

  const selectedFile = conflicts[selectedFileIndex] || null;

  const setResolution = useCallback(
    (filePath: string, choice: ResolutionChoice, content: string | null) => {
      setResolutions((prev) => ({
        ...prev,
        [filePath]: { choice, content },
      }));
    },
    []
  );

  const allResolved = useMemo(() => {
    if (conflicts.length === 0) return false;
    return conflicts.every((c) => resolutions[c.path] !== undefined);
  }, [conflicts, resolutions]);

  const resolvedCount = useMemo(() => {
    return conflicts.filter((c) => resolutions[c.path] !== undefined).length;
  }, [conflicts, resolutions]);

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const resolutionEntries = conflicts.map((c) => {
        const resolution = resolutions[c.path];
        return {
          path: c.path,
          resolvedContent: resolution.content,
          operation: data?.operation || "pull",
        };
      });
      const res = await apiRequest("POST", "/api/github/resolve-conflicts", {
        resolutions: resolutionEntries,
      });
      return await res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Conflicts Resolved",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/github/conflicts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/github/sync-status"] });
      setResolutions({});
      setManualContent({});
      setSelectedFileIndex(0);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Resolution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/github/conflicts");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/conflicts"] });
      setResolutions({});
      setManualContent({});
      setSelectedFileIndex(0);
      onOpenChange(false);
    },
  });

  if (isLoading && !externalData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading Conflicts
            </DialogTitle>
            <DialogDescription>
              Fetching conflict details...
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data?.hasConflicts || conflicts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Conflicts</DialogTitle>
            <DialogDescription>
              There are no pending conflicts to resolve.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              data-testid="button-close-no-conflicts"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            Resolve Conflicts
          </DialogTitle>
          <DialogDescription>
            {operation === "push" ? "Push" : "Pull"} detected{" "}
            {conflicts.length} conflicting file(s). Choose how to resolve each
            file, then apply all resolutions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
          <div className="w-56 shrink-0 border rounded-md overflow-hidden flex flex-col">
            <div className="p-2 border-b bg-muted/50">
              <span className="text-sm font-medium text-muted-foreground">
                Files ({resolvedCount}/{conflicts.length})
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1">
                {conflicts.map((file, idx) => {
                  const resolved = resolutions[file.path];
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 ${
                        idx === selectedFileIndex
                          ? "bg-accent"
                          : "hover-elevate"
                      }`}
                      data-testid={`button-conflict-file-${idx}`}
                    >
                      {resolved ? (
                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className="truncate flex-1">
                        {file.path.split("/").pop()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {selectedFile && (
            <div className="flex-1 flex flex-col gap-3 min-h-0 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span
                    className="text-sm font-mono truncate"
                    data-testid="text-conflict-file-path"
                  >
                    {selectedFile.path}
                  </span>
                </div>
                <Badge variant="secondary" data-testid="text-conflict-reason">
                  {selectedFile.reason}
                </Badge>
              </div>

              <Tabs defaultValue="diff" className="flex-1 flex flex-col min-h-0">
                <TabsList>
                  <TabsTrigger value="diff" data-testid="tab-diff">
                    Side-by-side Diff
                  </TabsTrigger>
                  <TabsTrigger value="local" data-testid="tab-local">
                    Local
                  </TabsTrigger>
                  <TabsTrigger value="remote" data-testid="tab-remote">
                    Remote
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="diff" className="flex-1 min-h-0 mt-2">
                  <DiffViewer
                    localContent={selectedFile.localContent}
                    remoteContent={selectedFile.remoteContent}
                  />
                </TabsContent>

                <TabsContent value="local" className="flex-1 min-h-0 mt-2">
                  <ScrollArea className="h-80 border rounded-md">
                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                      {selectedFile.localContent || "(file does not exist locally)"}
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="remote" className="flex-1 min-h-0 mt-2">
                  <ScrollArea className="h-80 border rounded-md">
                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                      {selectedFile.remoteContent ||
                        "(file does not exist on remote)"}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground mr-1">
                  Resolution:
                </span>
                <Button
                  variant={
                    resolutions[selectedFile.path]?.choice === "local"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setResolution(
                      selectedFile.path,
                      "local",
                      selectedFile.localContent ?? null
                    )
                  }
                  data-testid="button-keep-mine"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  {selectedFile.localContent === null
                    ? "Delete (locally deleted)"
                    : "Keep Mine"}
                </Button>
                <Button
                  variant={
                    resolutions[selectedFile.path]?.choice === "remote"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setResolution(
                      selectedFile.path,
                      "remote",
                      selectedFile.remoteContent ?? null
                    )
                  }
                  data-testid="button-take-theirs"
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1" />
                  {selectedFile.remoteContent === null
                    ? "Delete (remote deleted)"
                    : "Take Theirs"}
                </Button>
                <Button
                  variant={
                    resolutions[selectedFile.path]?.choice === "manual"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    const currentManual =
                      manualContent[selectedFile.path] ??
                      selectedFile.localContent ??
                      selectedFile.remoteContent ??
                      "";
                    setManualContent((prev) => ({
                      ...prev,
                      [selectedFile.path]: currentManual,
                    }));
                    setResolution(selectedFile.path, "manual", currentManual);
                  }}
                  data-testid="button-edit-manually"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit Manually
                </Button>
                {(selectedFile.localContent !== null || selectedFile.remoteContent !== null) && (
                  <Button
                    variant={
                      resolutions[selectedFile.path]?.choice === "delete"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setResolution(selectedFile.path, "delete", null)
                    }
                    data-testid="button-delete-file"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete File
                  </Button>
                )}

                {resolutions[selectedFile.path] && (
                  <Badge variant="outline" className="ml-auto">
                    <Check className="w-3 h-3 mr-1" />
                    {resolutions[selectedFile.path].choice === "local"
                      ? "Keeping local"
                      : resolutions[selectedFile.path].choice === "remote"
                      ? selectedFile.remoteContent === null
                        ? "Deleting (remote)"
                        : "Using remote"
                      : resolutions[selectedFile.path].choice === "delete"
                      ? "Deleting file"
                      : "Manual edit"}
                  </Badge>
                )}
              </div>

              {resolutions[selectedFile.path]?.choice === "manual" && (
                <Textarea
                  className="font-mono text-xs flex-shrink-0"
                  rows={10}
                  value={manualContent[selectedFile.path] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualContent((prev) => ({
                      ...prev,
                      [selectedFile.path]: val,
                    }));
                    setResolution(selectedFile.path, "manual", val);
                  }}
                  data-testid="textarea-manual-edit"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => dismissMutation.mutate()}
            disabled={resolveMutation.isPending}
            data-testid="button-dismiss-conflicts"
          >
            Dismiss
          </Button>
          <Button
            onClick={() => resolveMutation.mutate()}
            disabled={!allResolved || resolveMutation.isPending}
            data-testid="button-apply-resolutions"
          >
            {resolveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Apply All Resolutions ({resolvedCount}/{conflicts.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
