import { useState } from "react";
import { useLoanState } from "@/contexts/loan-application-context";
import { applicationRequest, applicationStore } from "@/lib/loan-application-store";
import { toast } from "@/hooks/use-toast";

export function WireRequestContent() {
  const [request] = useLoanState<{ requestedAt: string; requestedBy: string } | null>("wire-request", null, null, false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (saving || request) return;
    setSaving(true); setError("");
    try {
      await applicationStore.flush();
      if (applicationStore.dirty) throw new Error("Save or discard your open edits before requesting a wire.");
      const current = applicationStore.document;
      if (!current) throw new Error("Open a loan before requesting a wire.");
      const next = await applicationRequest(current.loan.id, "", {
        method: "PUT", body: JSON.stringify({
          section: "wire-request", value: { requestedAt: new Date().toISOString(), requestedBy: "Prototype user" },
          generation: current.generation, revision: current.revision,
        }),
      });
      applicationStore.install(next);
      toast({ variant: "success", title: "Wire requested.", duration: 5000 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wire request could not be saved.");
    } finally { setSaving(false); }
  }
  return <section style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--roads-spacing-component-l)" }} data-testid="wire-request">
    <h2 className="headline-200" style={{ color: "var(--roads-text-primary)" }}>Wire Request</h2>
    <button type="button" className="body-200-strong" onClick={() => void submit()} disabled={saving || !!request}
      data-testid="button-wire-request"
      style={{ backgroundColor: "var(--roads-bg-action)", color: "var(--roads-text-reverse)",
        border: "1px solid var(--roads-bg-action)", borderRadius: "var(--roads-radius-2xs)",
        padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)", cursor: saving || request ? "default" : "pointer" }}>
      {saving ? "Requesting…" : "Wire Request"}
    </button>
    {request && <p className="body-100" style={{ color: "var(--roads-text-secondary)" }}>
      Wire requested by {request.requestedBy} on {new Date(request.requestedAt).toLocaleString("en-US")}
    </p>}
    {error && <p className="body-100" role="alert" style={{ color: "var(--roads-text-error)" }}>{error}</p>}
  </section>;
}
