import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApplicationStatus } from "@/contexts/loan-application-context";
import { applicationRequest } from "@/lib/loan-application-store";

export function LoanDemoControls() {
  const store = useApplicationStatus();
  const [action, setAction] = useState<"reset" | "blend" | "trid" | null>(null);
  const [busy, setBusy] = useState(false);
  const [borrowerCount, setBorrowerCount] = useState<1 | 2>(2);
  const [error, setError] = useState("");
  async function run() {
    if (!action || !store.document || busy) return;
    setBusy(true); setError("");
    try {
      await store.flush();
      if (action === "trid" && store.dirty) throw new Error("Save or discard your open edits before triggering TRID.");
      const current = store.document!;
      const fixtures = action !== "reset" ? await import("@/lib/blend-demo-fixture") : null;
      const sections = action === "trid" ? fixtures!.tridDemoSections(current.loan.id)
        : action === "blend" ? fixtures!.blendDemoSections(current.loan.id, borrowerCount) : undefined;
      const next = await applicationRequest(current.loan.id, "/demo", {
        method: "POST", body: JSON.stringify({
          action, generation: current.generation, revision: current.revision, confirmed: true, sections,
          ...(action === "blend" ? { borrowerCount } : {}),
        }),
      });
      store.install(next);
      setAction(null);
      window.dispatchEvent(new Event("loan-application-replaced"));
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  function actionControl(kind: "reset" | "blend" | "trid", label: string) {
    return <div className="mt-auto h-28 shrink-0 flex flex-col justify-end">{action === kind ? <div role="alert" aria-label={`Confirm ${label}`} className="rounded-md border border-red-300 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950">
      <div className="flex flex-col gap-2">
        <Button autoFocus className="h-auto whitespace-normal py-2" variant="secondary" disabled={busy || store.pending > 0 || !!store.error} onClick={run}>{busy ? "Applying…" : kind === "trid" ? "Save and trigger TRID" : "Confirm replacement"}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => { setAction(null); setError(""); }}>Cancel</Button>
      </div>
    </div> : <Button className="w-full h-auto whitespace-normal py-2" variant="secondary" disabled={busy || !!store.error || (kind === "trid" && store.document?.businessRules?.trid.status === "satisfied")} onClick={() => { setAction(kind); setError(""); }}>{label}</Button>}</div>;
  }
  return <div className="flex flex-col gap-3" data-testid="loan-demo-controls">
    <p className="text-sm text-muted-foreground">
      Loan {store.document?.loan.loanNumber} only · Shared by all viewers · Synthetic data only
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
    <div className="min-w-0 h-80 flex flex-col gap-3 rounded border p-4 overflow-y-auto" data-testid="demo-reset-card">
      <h3 className="font-semibold">Blank application</h3>
      <p className="text-sm text-muted-foreground">Clear all application data and progress for manual entry.</p>
      {actionControl("reset", "Reset All Application Data")}
    </div>
    <div className="min-w-0 h-80 flex flex-col gap-3 rounded border p-4 overflow-y-auto" data-testid="demo-blend-card">
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
    <div className="min-w-0 h-80 flex flex-col gap-3 rounded border p-4 overflow-y-auto" data-testid="demo-trid-card">
      <h3 className="font-semibold">TRID application</h3>
      <p className="text-sm text-muted-foreground">Fill and save missing TRID fields. Keep existing valid data.</p>
      {store.document?.businessRules?.trid.status === "satisfied" && <p className="text-sm">Already satisfied. Reset to start again.</p>}
      {actionControl("trid", "Trigger TRID")}
    </div>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
