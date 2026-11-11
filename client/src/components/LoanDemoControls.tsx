import { feeCircumstancesSchema, FEE_CIRCUMSTANCES_KEY } from "@shared/fee-circumstances";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApplicationStatus } from "@/contexts/loan-application-context";
import { applicationRequest } from "@/lib/loan-application-store";
import { Switch } from "@/components/ui/switch";
import { decisionMode, type DecisionMode } from "@shared/business-rules/decision-simulation";

type DemoAction = "reset" | "blend" | "trid" | "checklist" | "trid-reset" | "trid-manual";

export function LoanDemoControls({ onViewCircumstances }: { onViewCircumstances?: () => void } = {}) {
  const store = useApplicationStatus();
  const [action, setAction] = useState<DemoAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [borrowerCount, setBorrowerCount] = useState<1 | 2>(2);
  const [error, setError] = useState("");
  async function changeDecisionMode(value: DecisionMode) {
    if (!store.document || busy) return;
    setBusy(true); setError("");
    try {
      store.write("decision-mode", value);
      await store.flush();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function toggleCreditFrozen(value: boolean) {
    if (!store.document || busy) return;
    setBusy(true); setError("");
    try {
      store.write("credit-frozen", value);
      await store.flush();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function run() {
    if (!action || !store.document || busy) return;
    setBusy(true); setError("");
    try {
      await store.flush();
      if (action !== "reset" && action !== "blend" && store.dirty) throw new Error("Save or discard your open edits before continuing.");
      const current = store.document!;
      const fixtures = action === "blend" || action === "trid" ? await import("@/lib/blend-demo-fixture") : null;
      const sections = action === "trid" ? fixtures!.tridDemoSections(current.loan.id)
        : action === "blend" ? fixtures!.blendDemoSections(current.loan.id, borrowerCount) : undefined;
      const next = await applicationRequest(current.loan.id, "/demo", {
        method: "POST", body: JSON.stringify({
          action, generation: current.generation, revision: current.revision, confirmed: true, sections,
          ...(action === "blend" ? { borrowerCount } : {}),
        }),
      });
      if (store.document?.loan.id !== current.loan.id || store.document.generation !== current.generation) return;
      store.install(next);
      setAction(null);
      window.dispatchEvent(new Event("loan-application-replaced"));
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  function actionControl(kind: DemoAction, label: string) {
    return <div className="mt-auto shrink-0 flex flex-col justify-end">{action === kind ? <div role="alert" aria-label={`Confirm ${label}`} className="rounded-md border border-red-300 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950">
      <div className="flex flex-col gap-2">
        <Button autoFocus className="h-auto whitespace-normal py-2" variant="secondary" disabled={busy || store.pending > 0 || !!store.error} onClick={run}>{busy ? "Applying…" : kind === "trid" ? "Save and trigger TRID" : kind === "trid-manual" ? "Confirm trigger" : kind === "checklist" || kind === "trid-reset" || kind === "reset" ? "Confirm reset" : "Confirm replacement"}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => { setAction(null); setError(""); }}>Cancel</Button>
      </div>
    </div> : <Button className="w-full h-auto whitespace-normal py-2" variant="secondary" disabled={busy || !!store.error || (kind === "trid" && store.document?.businessRules?.trid.status === "satisfied")} onClick={() => { setAction(kind); setError(""); }}>{label}</Button>}</div>;
  }
  return <div className="flex flex-col gap-3" data-testid="loan-demo-controls">
    <p className="text-sm text-muted-foreground">
      Loan {store.document?.loan.loanNumber} only · Shared by all viewers · Synthetic data only
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
    {onViewCircumstances && <div className="min-w-0 h-64 flex flex-col gap-2 rounded border p-4 overflow-y-auto" data-testid="demo-circumstance-card">
      <h3 className="font-semibold">Change of circumstance</h3>
      <p className="text-sm text-muted-foreground">Review the latest saved appraisal fee change reason.</p>
      <Button className="mt-auto w-full h-auto whitespace-normal py-2" variant="secondary"
        disabled={busy || !store.document || store.pending > 0 || !!store.error ||
          !(feeCircumstancesSchema.safeParse(store.document?.sections[FEE_CIRCUMSTANCES_KEY]).data?.records.length)}
        onClick={onViewCircumstances}>View change of circumstance</Button>
    </div>}
    <div className="min-w-0 h-64 flex flex-col gap-2 rounded border p-4 overflow-y-auto" data-testid="demo-decision-card">
      <h3 className="font-semibold">Loan decision</h3>
      <p className="text-sm text-muted-foreground">Choose the outcome of the next loan decision.</p>
      <fieldset className="mt-auto flex flex-col gap-3 text-sm"
        disabled={busy || !store.document || store.pending > 0 || !!store.error}>
        <legend className="sr-only">Loan decision simulation</legend>
        {([
          ["force-approval", "Force approval"],
          ["force-denial", "Force denial"],
        ] as const).map(([value, label]) => <label key={value} className="flex items-center gap-2">
          <input type="radio" name="loan-decision-mode" value={value}
            checked={decisionMode(store.document) === value} onChange={() => void changeDecisionMode(value)} />
          {label}
        </label>)}
      </fieldset>
    </div>
    <div className="min-w-0 h-64 flex flex-col gap-2 rounded border p-4 overflow-y-auto" data-testid="demo-credit-freeze-card">
      <h3 className="font-semibold">Credit freeze</h3>
      <p className="text-sm text-muted-foreground">Block credit pulls for this loan until the freeze is lifted.</p>
      <div className="mt-auto shrink-0 flex items-end justify-between gap-2">
        <label htmlFor="demo-credit-frozen">Credit frozen</label>
        <Switch id="demo-credit-frozen" checked={store.document?.sections?.["credit-frozen"] === true}
          disabled={busy || !store.document || store.pending > 0 || !!store.error}
          onCheckedChange={toggleCreditFrozen} />
      </div>
    </div>
    <div className="min-w-0 h-64 flex flex-col gap-2 rounded border p-4 overflow-y-auto" data-testid="demo-reset-card">
      <h3 className="font-semibold">Salesforce opportunity</h3>
      <p className="text-sm text-muted-foreground">Return this loan to its original Salesforce opportunity data. Everything added since is removed.</p>
      {actionControl("reset", "Reset All Application Data")}
    </div>
    <div className="min-w-0 h-64 flex flex-col gap-2 rounded border p-4 overflow-y-auto" data-testid="demo-blend-card">
      <h3 className="font-semibold">Blend import</h3>
      <p className="text-sm text-muted-foreground">Replace the application with mock borrower and loan data.</p>
      <fieldset disabled={busy} className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
        <legend className="sr-only">Borrowers to import</legend>
        {([1, 2] as const).map(count => <label key={count} className="flex items-center gap-2">
          <input type="radio" name="blend-borrower-count" value={count} checked={borrowerCount === count} onChange={() => setBorrowerCount(count)} />
          {count} {count === 1 ? "borrower" : "borrowers"}
        </label>)}
      </fieldset>
      {actionControl("blend", "New Blend Import")}
    </div>
    <div className="min-w-0 h-64 flex flex-col gap-2 rounded border p-4 overflow-y-auto" data-testid="demo-trid-card">
      <h3 className="font-semibold">TRID application</h3>
      <p className="text-sm text-muted-foreground">{store.document?.businessRules?.trid.status === "satisfied"
        ? "Clear TRID inputs, or start another Loan Estimate without changing them."
        : "Fill and save missing TRID fields. Keep existing valid data."}</p>
      {store.document?.businessRules?.trid.status === "satisfied"
        ? action === "trid-reset" || action === "trid-manual"
          ? actionControl(action, action === "trid-reset" ? "Reset TRID Data" : "Manually Trigger TRID")
          : <div className="mt-auto shrink-0 flex flex-col justify-end gap-2">
            <Button variant="secondary" disabled={busy || !!store.error} onClick={() => { setAction("trid-reset"); setError(""); }}>Reset TRID Data</Button>
            <Button variant="secondary" disabled={busy || !!store.error} onClick={() => { setAction("trid-manual"); setError(""); }}>Manually Trigger TRID</Button>
          </div>
        : actionControl("trid", "Trigger TRID")}
    </div>
    <div className="min-w-0 h-64 flex flex-col gap-2 rounded border p-4 overflow-y-auto" data-testid="demo-checklist-card">
      <h3 className="font-semibold">Checklist data</h3>
      <p className="text-sm text-muted-foreground">Clear task progress, generated documents, credit results, rate locks, and activity. Keep application data.</p>
      {actionControl("checklist", "Reset Checklist Data")}
    </div>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
