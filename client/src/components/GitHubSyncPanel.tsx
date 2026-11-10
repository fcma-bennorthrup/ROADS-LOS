import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoanDemoControls } from "@/components/LoanDemoControls";

export function GitHubSyncPanel({
  open,
  onOpenChange,
  loanActive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanActive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={loanActive ? "max-w-6xl w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto" : undefined}>
        <DialogHeader>
          <DialogTitle>Prototype Admin Controls</DialogTitle>
          <DialogDescription className={loanActive ? undefined : "sr-only"}>
            {loanActive ? "Simulate the current loan’s application journey." : "Prototype administration controls."}
          </DialogDescription>
        </DialogHeader>
        {loanActive ? <LoanDemoControls /> : <div className="min-h-24" data-testid="admin-controls-shell" />}
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
