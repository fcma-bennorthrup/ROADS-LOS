import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApplicationStatus } from "@/contexts/loan-application-context";
import { calculateSummary } from "@shared/summary";
import { summaryDebugCopy } from "@/lib/summary-debug-copy";

export function SummaryDebugDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const app = useApplicationStatus().document;
  const missing = app ? [...new Set(calculateSummary(app).missing.map(summaryDebugCopy))] : null;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Debug</DialogTitle>
        <DialogDescription>What’s missing and how to complete the Summary calculations.</DialogDescription>
      </DialogHeader>
      {missing === null ? <p>Loan data is not available yet.</p>
        : missing.length ? <ul className="body-100 list-disc pl-5 space-y-2" data-testid="summary-missing-inputs">
          {missing.map(message => <li key={message}>{message}</li>)}
        </ul> : <p>All Summary calculations have the required data.</p>}
    </DialogContent>
  </Dialog>;
}
