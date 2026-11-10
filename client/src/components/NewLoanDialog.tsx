import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { applicationRequest } from "@/lib/loan-application-store";

interface CreatedLoan { id: string; loanNumber: string }
export function NewLoanDialog({ open, onOpenChange, onBusyChange, onSfCreated }: {
  open: boolean; onOpenChange: (open: boolean) => void; onBusyChange: (busy: boolean) => void;
  onSfCreated?: (loan: CreatedLoan) => void;
}) {
  const [, navigate] = useLocation();
  const [source, setSource] = useState<"sf" | "blend">("sf");
  const [borrowerCount, setBorrowerCount] = useState<1 | 2>(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedLoan | null>(null);
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
          source: source === "sf" ? "sf" : "blank", idempotencyKey: attemptKey.current,
        });
        loan = await response.json() as CreatedLoan;
        retained.current = loan; setCreated(loan);
        // Even a failed import must expose the retained blank in the index.
        void queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
      }
      if (source === "blend") {
        const { blendDemoSections } = await import("@/lib/blend-demo-fixture");
        await applicationRequest(loan.id, "/demo", {
          method: "POST", body: JSON.stringify({
            action: "blend", borrowerCount, generation: 0, revision: 0, confirmed: true,
            sections: blendDemoSections(loan.id, borrowerCount),
          }),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
      onOpenChange(false);
      if (source === "sf") {
        onSfCreated?.(loan);
        retained.current = null; attemptKey.current = null;
        setCreated(null); setAttempted(false);
      } else {
        navigate(`~/loans/${encodeURIComponent(loan.id)}`);
      }
    } catch (error) {
      setError((error as Error).message);
      void queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
    } finally { inFlight.current = false; setBusy(false); onBusyChange(false); }
  }
  return <Dialog open={open} onOpenChange={next => { if (!busy) onOpenChange(next); }}>
    <DialogContent style={{ background: "var(--roads-bg-primary)", color: "var(--roads-text-primary)" }} data-testid="new-loan-dialog">
      <DialogHeader>
        <DialogTitle className="headline-200">New loan</DialogTitle>
        <DialogDescription className="body-200" style={{ color: "var(--roads-text-secondary)" }}>Create a simulated SF opportunity or import synthetic Blend data.</DialogDescription>
      </DialogHeader>
      <form className="pipeline-form body-100" onSubmit={event => { event.preventDefault(); void create(); }}>
        <fieldset disabled={busy || attempted}>
          <legend className="body-200-strong">Application source</legend>
          <label><input data-testid="source-sf" type="radio" name="new-loan-source" checked={source === "sf"} onChange={() => setSource("sf")} />New SF Opportunity</label>
          <label><input data-testid="source-blend" type="radio" name="new-loan-source" checked={source === "blend"} onChange={() => setSource("blend")} />Blend import</label>
        </fieldset>
        {source === "blend" && <fieldset disabled={busy || attempted}>
          <legend className="body-200-strong">Borrowers to import</legend>
          {([1, 2] as const).map(count => <label key={count}>
            <input data-testid={`new-loan-borrowers-${count}`} type="radio" name="new-loan-borrowers" checked={borrowerCount === count} onChange={() => setBorrowerCount(count)} />
            {count} {count === 1 ? "borrower" : "borrowers"}
          </label>)}
        </fieldset>}
        {error && <div role="alert" data-testid="new-loan-error" className="body-200 pipeline-error">
          <p>{error}</p>
          {!created && attempted && <p>Creation was not confirmed. Retry will recover the same loan if it was saved.</p>}
          {created && <p>Loan {created.loanNumber} was retained in Pipeline as a blank application. Retry uses this same loan and will not create a duplicate, or open it to continue manually.</p>}
        </div>}
        <DialogFooter>
          <button type="button" className="pipeline-button pipeline-secondary body-200-strong" disabled={busy} data-testid="cancel-new-loan" onClick={() => onOpenChange(false)}>Cancel</button>
          {created && error && <button type="button" data-testid="open-retained-loan" disabled={busy} className="pipeline-button pipeline-secondary body-200-strong" onClick={() => {
            onOpenChange(false);
            navigate(`~/loans/${encodeURIComponent(created.id)}/origination?section=Borrower%20Information`);
          }}>Open blank loan</button>}
          <button type="submit" data-testid="confirm-new-loan" disabled={busy} className="pipeline-button body-200-strong">{busy ? source === "blend" ? "Creating and importing…" : "Creating…" : created ? "Retry import" : "Create loan"}</button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
