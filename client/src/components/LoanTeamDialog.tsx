import { FiUserPlus, FiX } from "react-icons/fi";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogClose, DialogPortal, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "@/styles/loan-team.css";

const supportByOfficer: Record<string, string> = {
  "Sarah Williams": "Tyler Coke",
  "Rylee Alcorn": "Matthew Lewis",
  "Conner Welch": "Nikki Wheat",
  "Connor Welch": "Nikki Wheat",
};

export function LoanTeamDialog({ loanNumber, loanOfficer }: { loanNumber: string; loanOfficer?: string }) {
  const officer = loanOfficer?.trim() || "Not Assigned";
  const roles = [
    { name: "Originator", primary: officer },
    { name: "Sales Support", primary: Object.hasOwn(supportByOfficer, officer) ? supportByOfficer[officer] : "Not Assigned" },
    { name: "Operations", primary: "Not Assigned" },
  ];
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" aria-label={`View loan team for loan ${loanNumber}`} title="View loan team"><FiUserPlus aria-hidden /></button>
    </DialogTrigger>
    <DialogPortal>
      <DialogPrimitive.Overlay className="loan-team-overlay" onClick={event => event.stopPropagation()} />
      <DialogPrimitive.Content className="loan-team-dialog" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
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
                <input aria-label={`${role.name} ${position}`} className="body-200-strong" readOnly value={position === "Primary" ? role.primary : "Not Assigned"} />
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
