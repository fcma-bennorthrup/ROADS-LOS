import { useRef, useState } from "react";
import { FiMoreVertical, FiX } from "react-icons/fi";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { applicationRequest, applicationStore } from "@/lib/loan-application-store";
import { queryClient } from "@/lib/queryClient";
import type { PipelineLoan } from "@shared/pipeline";
import "@/styles/loan-team.css";

export function WithdrawLoanAction({ loan, detailMenu, onOpen, onRestoreFocus }: {
  loan: Pick<PipelineLoan, "id" | "loanNumber" | "withdrawn">;
  detailMenu?: boolean;
  onOpen?: () => void;
  onRestoreFocus?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  function changeOpen(value: boolean) {
    if (submitting.current) return;
    setOpen(value);
    setAcknowledged(false);
    setError("");
    if (value) onOpen?.();
  }
  async function withdraw() {
    if (!acknowledged || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      if (detailMenu) {
        if (applicationStore.document?.loan.id !== loan.id) throw new Error("The active loan changed. Please reopen the menu.");
        await applicationStore.withdraw();
      } else {
      const current = await applicationRequest(loan.id);
      // Preserve other fields and use the existing version-checked section save.
      await applicationRequest(loan.id, "", { method: "PUT", body: JSON.stringify({
        section: "withdrawal", value: { acknowledged: true },
        generation: current.generation, revision: current.revision,
      }) });
      }
      queryClient.setQueryData<PipelineLoan[]>(["/api/loans"], rows =>
        rows?.map(row => row.id === loan.id ? { ...row, withdrawn: true } : row));
      void queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      setOpen(false);
      setAcknowledged(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The loan could not be withdrawn. Please try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return <>
    {detailMenu ? <button ref={trigger} type="button" data-testid="menu-item-withdraw-loan"
      disabled={loan.withdrawn} className="body-100 w-full text-left rounded hover:bg-muted disabled:opacity-50"
      style={{ height: 40, padding: "0 12px", color: "var(--roads-text-primary)", whiteSpace: "nowrap" }}
      onClick={() => changeOpen(true)}>Withdraw Loan</button> : <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button ref={trigger} type="button" aria-label={`More actions for loan ${loan.loanNumber}`} title="More actions"><FiMoreVertical aria-hidden /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
        onCloseAutoFocus={event => { if (open) event.preventDefault(); }}>
        <DropdownMenuItem disabled={loan.withdrawn} onSelect={() => changeOpen(true)}>Withdraw Loan</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>}
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="loan-team-overlay" onClick={event => event.stopPropagation()} />
        <DialogPrimitive.Content className="loan-team-dialog" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
          onCloseAutoFocus={event => { event.preventDefault(); if (onRestoreFocus) onRestoreFocus(); else trigger.current?.focus(); }}>
          <header className="loan-team-header">
            <DialogTitle className="headline-300">Withdraw Loan</DialogTitle>
            <button type="button" className="loan-team-x" disabled={pending} aria-label="Close withdraw loan" onClick={() => changeOpen(false)}><FiX aria-hidden /></button>
          </header>
          <div className="loan-team-body">
            <DialogDescription className="body-100" style={{ color: "var(--roads-text-primary)" }}>Are you sure you want to withdraw this loan?</DialogDescription>
            <label className="body-100 flex items-start" style={{ gap: 8 }}>
              <input type="checkbox" checked={acknowledged} disabled={pending} onChange={event => setAcknowledged(event.target.checked)}
                style={{ marginTop: 4, accentColor: "var(--roads-bg-action)" }} />
              I acknowledge the borrower has requested this loan be withdrawn
            </label>
            {error && <p role="alert" className="body-100" style={{ color: "var(--roads-bg-error)" }}>{error}</p>}
          </div>
          <footer className="loan-team-footer" style={{ gap: 12 }}>
            <button type="button" className="body-200-strong" disabled={pending} onClick={() => changeOpen(false)}
              style={{ padding: "6px 16px", border: "1px solid var(--roads-border-dark)", borderRadius: "var(--roads-radius-2xs)" }}>Cancel</button>
            <button type="button" className="loan-team-close body-200-strong" disabled={!acknowledged || pending} onClick={withdraw}
              style={{ opacity: !acknowledged || pending ? 0.5 : 1 }}>{pending ? "Withdrawing…" : "Withdraw Loan"}</button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  </>;
}
