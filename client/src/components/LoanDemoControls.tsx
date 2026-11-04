import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApplicationStatus } from "@/contexts/loan-application-context";
import { applicationRequest } from "@/lib/loan-application-store";

export function LoanDemoControls() {
  const store = useApplicationStatus();
  const [action, setAction] = useState<"reset" | "blend" | "trid" | null>(null);
  const [busy, setBusy] = useState(false);
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
        : action === "blend" ? fixtures!.blendDemoSections(current.loan.id) : undefined;
      const next = await applicationRequest(current.loan.id, "/demo", {
        method: "POST", body: JSON.stringify({
          action, generation: current.generation, revision: current.revision, confirmed: true, sections,
        }),
      });
      store.install(next);
      window.dispatchEvent(new Event("loan-application-replaced"));
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-col gap-4" data-testid="loan-demo-controls">
    <p className="text-sm text-muted-foreground">
      Loan {store.document?.loan.loanNumber}. These actions affect this loan for everyone viewing it. Other loans are not affected. Use synthetic data only.
    </p>
    <div className="rounded border p-4 space-y-2">
      <h3 className="font-semibold">Start with a blank application</h3>
      <p className="text-sm">Clear borrower details, financials, collateral, fees, pricing, and workflow progress. Keep the loan available for manual entry.</p>
      <Button variant="outline" disabled={busy || !!store.error} onClick={() => setAction("reset")}>Reset All Application Data</Button>
    </div>
    <div className="rounded border p-4 space-y-2">
      <h3 className="font-semibold">Simulate a point-of-sale import</h3>
      <p className="text-sm">Replace the application with mock borrowers, loan details, income, assets, liabilities, and property data. This does not contact Blend or complete underwriting.</p>
      <Button disabled={busy || !!store.error} onClick={() => setAction("blend")}>New Blend Import</Button>
    </div>
    <div className="rounded border p-4 space-y-2">
      <h3 className="font-semibold">Simulate a complete TRID application</h3>
      <p className="text-sm">Fill missing required fields with synthetic borrower, address, loan amount, income, and estimated value data, then save them to trigger TRID. Existing valid values and unrelated loan data are preserved.</p>
      <Button variant="outline" disabled={busy || !!store.error || store.document?.businessRules?.trid.status === "satisfied"} onClick={() => setAction("trid")}>Trigger TRID</Button>
      {store.document?.businessRules?.trid.status === "satisfied" && <p className="text-sm">TRID is already satisfied. Reset the demo loan to start a new journey.</p>}
    </div>
    {action && <div role="alert" className="rounded border border-amber-600 bg-amber-50 p-4 text-black space-y-3">
      <p>{action === "trid" ? "Fill and save missing TRID inputs for this loan? Missing or invalid required values will receive demo data. Save or discard open edits first. This does not reset the loan or undo Loan Estimate delivery."
        : `${action === "reset" ? "Clear all application data?" : "Replace this application with mock Blend data?"} Saved and unsaved entries and workflow results for this loan will be replaced for all viewers. This cannot be undone here.`}</p>
      <div className="flex gap-2">
        <Button variant={action === "trid" ? "default" : "destructive"} disabled={busy || store.pending > 0} onClick={run}>{busy ? "Applying…" : action === "trid" ? "Save and trigger TRID" : "Confirm replacement"}</Button>
        <Button variant="outline" disabled={busy} onClick={() => setAction(null)}>Cancel</Button>
      </div>
    </div>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
