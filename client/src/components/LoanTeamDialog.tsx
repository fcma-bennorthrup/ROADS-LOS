import { FiUserPlus, FiX } from "react-icons/fi";
import { useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogClose, DialogPortal, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "@/styles/loan-team.css";
import type { OperationsTeam } from "@shared/operations-team";
import { defaultSalesSupport, type SalesSupportTeam } from "@shared/sales-support-team";

export function LoanTeamDialog({ loanNumber, loanOfficer, operationsTeam, salesSupportTeam }: { loanNumber: string; loanOfficer?: string; operationsTeam?: OperationsTeam; salesSupportTeam?: SalesSupportTeam }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const officer = loanOfficer?.trim() || "Not Assigned";
  const roles = [
    { name: "Originator", primary: officer },
    { name: "Sales Support", primary: salesSupportTeam?.primary || defaultSalesSupport(officer) || "Not Assigned", secondary: salesSupportTeam?.secondary || "Not Assigned" },
    { name: "Operations", primary: operationsTeam?.primary || "Not Assigned", secondary: operationsTeam?.secondary || "Not Assigned" },
  ];
  return <Dialog>
    <DialogTrigger asChild>
      <button ref={triggerRef} type="button" aria-label={`View loan team for loan ${loanNumber}`} title="View loan team"><FiUserPlus aria-hidden /></button>
    </DialogTrigger>
    <DialogPortal>
      <DialogPrimitive.Overlay className="loan-team-overlay" onClick={event => event.stopPropagation()} />
      <DialogPrimitive.Content className="loan-team-dialog" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
        onCloseAutoFocus={event => {
          // A refreshed list can unmount this row and its trigger together.
          // Preserve Radix's normal restoration when the trigger still exists.
          if (!triggerRef.current?.isConnected) {
            const fallback = document.querySelector<HTMLInputElement>('[data-testid="pipeline-page"] input[type="search"]');
            if (fallback) {
              event.preventDefault();
              fallback.focus({ preventScroll: true });
            }
          }
        }}>
        <header className="loan-team-header">
          <DialogTitle className="headline-300">Loan Team</DialogTitle>
          <DialogDescription className="sr-only">Team assignments for loan {loanNumber}. Read only.</DialogDescription>
          <DialogClose className="loan-team-x" aria-label="Close loan team"><FiX aria-hidden /></DialogClose>
        </header>
        <div className="loan-team-body">
          {roles.map(role => <section key={role.name} aria-label={role.name}>
            <h3 className="headline-400">{role.name}</h3>
            <div className="loan-team-positions">
              {(["Primary", "Secondary"] as const).map(position => <label key={position} className="body-200">
                {position}
                <input aria-label={`${role.name} ${position}`} className="body-200-strong" readOnly value={position === "Primary" ? role.primary : role.secondary || "Not Assigned"} />
              </label>)}
            </div>
          </section>)}
        </div>
        <footer className="loan-team-footer">
          <DialogClose className="loan-team-close body-200-strong">Close</DialogClose>
        </footer>
      </DialogPrimitive.Content>
    </DialogPortal>
  </Dialog>;
}
