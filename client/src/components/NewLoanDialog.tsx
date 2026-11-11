import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreatedLoan { id: string; loanNumber: string }
export function NewLoanDialog({ open, onOpenChange, onBusyChange, onSfCreated }: {
  open: boolean; onOpenChange: (open: boolean) => void; onBusyChange: (busy: boolean) => void;
  onSfCreated?: (loan: CreatedLoan) => void;
}) {
  const [borrowerCount, setBorrowerCount] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const retained = useRef<CreatedLoan | null>(null);
  const attemptKey = useRef<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const inFlight = useRef(false);
  async function create() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); onBusyChange(true); setError("");
    try {
      let loan = retained.current;
      if (!loan) {
        attemptKey.current ??= crypto.randomUUID();
        setAttempted(true);
        const response = await apiRequest("POST", "/api/loans", {
          source: "sf", borrowerCount, idempotencyKey: attemptKey.current,
        });
        loan = await response.json() as CreatedLoan;
        retained.current = loan;
        void queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
      onOpenChange(false);
      onSfCreated?.(loan);
      retained.current = null; attemptKey.current = null;
      setAttempted(false); setBorrowerCount(1);
    } catch (error) {
      setError((error as Error).message);
      void queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
    } finally { inFlight.current = false; setBusy(false); onBusyChange(false); }
  }
  return <Dialog open={open} onOpenChange={next => { if (!busy) onOpenChange(next); }}>
    <DialogContent style={{ background: "var(--roads-bg-primary)", color: "var(--roads-text-primary)" }} data-testid="new-loan-dialog">
      <DialogHeader>
        <DialogTitle className="headline-200">New loan</DialogTitle>
        <DialogDescription className="body-200" style={{ color: "var(--roads-text-secondary)" }}>Create a simulated Salesforce opportunity.</DialogDescription>
      </DialogHeader>
      <form className="pipeline-form body-100" onSubmit={event => { event.preventDefault(); void create(); }}>
        <fieldset disabled={busy || attempted}>
          <legend className="body-200-strong">Borrowers</legend>
          {([1, 2] as const).map(count => <label key={count}>
            <input data-testid={`new-loan-borrowers-${count}`} type="radio" name="new-loan-borrowers" checked={borrowerCount === count} onChange={() => setBorrowerCount(count)} />
            {count} {count === 1 ? "borrower" : "borrowers"}
          </label>)}
        </fieldset>
        {error && <div role="alert" data-testid="new-loan-error" className="body-200 pipeline-error">
          <p>{error}</p>
          {attempted && <p>Creation was not confirmed. Retry will recover the same loan if it was saved.</p>}
        </div>}
        <DialogFooter>
          <button type="button" className="pipeline-button pipeline-secondary body-200-strong" disabled={busy} data-testid="cancel-new-loan" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="submit" data-testid="confirm-new-loan" disabled={busy} className="pipeline-button body-200-strong">{busy ? "Creating…" : "Create loan"}</button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
