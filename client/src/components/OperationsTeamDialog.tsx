import { useRef, useState } from "react";
import { FiUserPlus, FiX } from "react-icons/fi";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { applicationRequest } from "@/lib/loan-application-store";
import { queryClient } from "@/lib/queryClient";
import { OPERATIONS_PEOPLE, operationsTeamSchema } from "@shared/operations-team";
import { SALES_SUPPORT_PEOPLE, salesSupportTeamSchema, defaultSalesSupport } from "@shared/sales-support-team";
import { pipelineView, type PipelineLoan } from "@shared/pipeline";
import type { LoanApplication } from "@shared/loan-application";
import "@/styles/loan-team.css";

export function OperationsTeamDialog({ loan, role = "Operations" }: { loan: PipelineLoan; role?: "Operations" | "Sales Support" }) {
  const sales = role === "Sales Support";
  const schema = sales ? salesSupportTeamSchema : operationsTeamSchema;
  const people = sales ? SALES_SUPPORT_PEOPLE : OPERATIONS_PEOPLE;
  const section = sales ? "sales-support-team" : "operations-team";
  const [open, setOpen] = useState(false);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [current, setCurrent] = useState<LoanApplication | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const saving = useRef(false);
  const requestId = useRef(0);
  async function load() {
    const id = ++requestId.current;
    setBusy(true); setError(""); setCurrent(null);
    try {
      const document = await applicationRequest(loan.id);
      if (id !== requestId.current) return;
      const team = schema.safeParse(document.sections[section]);
      setPrimary(team.success ? team.data.primary : sales ? defaultSalesSupport(document.meta?.opportunity?.loanOfficer) : "");
      setSecondary(team.success ? team.data.secondary : "");
      setCurrent(document);
    } catch (failure) {
      if (id === requestId.current) setError((failure as Error).message);
    } finally { if (id === requestId.current) setBusy(false); }
  }
  function changeOpen(next: boolean) {
    if (saving.current) return;
    setOpen(next);
    if (next) { setPrimary(""); setSecondary(""); void load(); }
    else { requestId.current++; setBusy(false); setCurrent(null); }
  }
  const parsed = schema.safeParse({ primary, secondary });
  async function save() {
    if (!parsed.success || !current || saving.current || busy) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const saved = await applicationRequest(loan.id, "", { method: "PUT", body: JSON.stringify({
        section, value: parsed.data, generation: current.generation, revision: current.revision,
      }) });
      const updated = pipelineView(saved);
      queryClient.setQueryData<PipelineLoan[]>(["/api/loans"], rows => rows?.map(row => row.id === loan.id ? updated : row));
      void queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
      setOpen(false);
    } catch (failure) {
      setError((failure as Error).message);
    } finally { saving.current = false; setBusy(false); }
  }
  return <>
    <button ref={trigger} type="button" className={!sales && !loan.operationsTeam?.primary ? "pipeline-operations-assignment" : undefined}
      aria-label={`Edit ${role} team for loan ${loan.loanNumber}`} title={`${role} assignments`}
      onClick={event => { event.stopPropagation(); changeOpen(true); }}><FiUserPlus aria-hidden /></button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="loan-team-overlay" onClick={event => event.stopPropagation()} />
        <DialogPrimitive.Content className="loan-team-dialog operations-team-dialog" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
          onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
          <header className="loan-team-header">
            <DialogTitle className="headline-300">Loan Team Assignment</DialogTitle>
            <DialogDescription className="body-100">Assign primary and secondary (optional).</DialogDescription>
            <button className="loan-team-x" disabled={saving.current} aria-label={`Close ${role} assignments`} onClick={() => changeOpen(false)}><FiX aria-hidden /></button>
          </header>
          <form onSubmit={event => { event.preventDefault(); void save(); }}>
            <div className="loan-team-body">
              {busy && !current && <p role="status">Loading assignments…</p>}
              <h3 className="headline-300">{role}</h3>
              <div className="loan-team-positions">
                <label className="body-200-strong">Primary
                  <select aria-label={`${role} Primary`} required value={primary} disabled={busy || !current} onChange={event => setPrimary(event.target.value)}>
                    <option value="">Select primary</option>
                    {people.map(name => <option key={name} value={name} disabled={name === secondary}>{name}</option>)}
                  </select>
                </label>
                <label className="body-200-strong">Secondary
                  <select aria-label={`${role} Secondary`} value={secondary} disabled={busy || !current} onChange={event => setSecondary(event.target.value)}>
                    <option value="">Not Assigned</option>
                    {people.map(name => <option key={name} value={name} disabled={name === primary}>{name}</option>)}
                  </select>
                </label>
              </div>
              {primary && primary === secondary && <p role="alert">Primary and secondary must be different people.</p>}
              {error && <div role="alert" className="pipeline-error">{error}
                <button type="button" disabled={busy} onClick={() => void load()}>Reload saved assignments</button>
              </div>}
            </div>
            <footer className="loan-team-footer" style={{ gap: 12 }}>
              <span className="caption-100 operations-required-note">Primary position is required.</span>
              <button type="button" className="body-200-strong" disabled={saving.current} onClick={() => changeOpen(false)}>Cancel</button>
              <button className="pipeline-button body-200-strong" type="submit" disabled={busy || !current || !parsed.success}>{busy && current ? "Saving…" : "Save Changes"}</button>
            </footer>
          </form>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  </>;
}
