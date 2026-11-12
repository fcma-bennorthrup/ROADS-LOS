import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { applyFeeWaiver, type FeeRow } from "@shared/fees";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useLoanEditing } from "@/contexts/loan-application-context";
import { RoadsDropdown } from "./RoadsDropdown";

type FeeDraft = Pick<FeeRow, "fee" | "methodOfPayment" | "paidBy" | "paidTo" | "leAmount" | "cdAmount" | "shoppedForProvider" | "waived" | "waiver">;

const inputStyle: CSSProperties = {
  width: "100%", minWidth: 0, height: 40,
  padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
  background: "var(--roads-bg-primary)", border: "1px solid var(--roads-border-dark)",
  borderRadius: "var(--roads-radius-2xs)", color: "var(--roads-text-primary)",
  lineHeight: "20px", fontWeight: 600,
};
const buttonStyle: CSSProperties = {
  height: 32, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
  borderRadius: "var(--roads-radius-2xs)", border: "none", lineHeight: "16px",
  cursor: "pointer",
};
const paymentOptions = ["Financed", "Cash"].map(value => ({ value, label: value }));
const paidByOptions = ["Buyer", "Seller"].map(value => ({ value, label: value }));

function draftFrom(row: FeeRow): FeeDraft {
  return {
    fee: row.fee, methodOfPayment: row.methodOfPayment, paidBy: row.paidBy,
    paidTo: row.paidTo ?? "", leAmount: row.waiver?.leBase ?? row.leAmount, cdAmount: row.waiver?.cdBase ?? row.cdAmount,
    shoppedForProvider: row.shoppedForProvider ?? false,
    waived: row.waived ?? false,
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: "var(--roads-spacing-component-xs)" }}>
    <span className="label-strong" style={{ lineHeight: "16px" }}>{label}</span>
    {children}
  </div>;
}

export function FeeEditDialog({ fee, onSave, onClose }: {
  fee: FeeRow;
  onSave: (draft: FeeDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => draftFrom(fee));
  const [baseline] = useState(() => draftFrom(fee));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [waiverAmount, setWaiverAmount] = useState(fee.waiver?.amount ?? "");
  const [entire, setEntire] = useState(fee.waiver?.entire ?? fee.waived ?? false);
  const submitting = useRef(false);
  useLoanEditing(`fee-edit-${fee.id}`, JSON.stringify(draft) !== JSON.stringify(baseline) ||
    waiverAmount !== (fee.waiver?.amount ?? "") || entire !== (fee.waiver?.entire ?? fee.waived ?? false) || saving || !!error);

  function change<K extends keyof FeeDraft>(key: K, value: FeeDraft[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
  }
  function close() {
    if (!submitting.current) onClose();
  }
  async function save() {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(entire || waiverAmount !== "" || fee.waiver
        ? applyFeeWaiver({ ...fee, ...draft }, waiverAmount, entire)
        : { ...draft, waived: false });
      onClose();
    } catch (cause) {
      setError(`Fee not saved. ${cause instanceof Error ? cause.message : "Please try again."}`);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        aria-busy={saving}
        onEscapeKeyDown={event => { if (submitting.current) event.preventDefault(); }}
        onInteractOutside={event => { if (submitting.current) event.preventDefault(); }}
        data-testid="fee-edit-dialog"
        style={{
          position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          zIndex: 50, width: "calc(100% - 32px)", maxWidth: 512, maxHeight: "calc(100dvh - 32px)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: "var(--roads-bg-primary)", color: "var(--roads-text-primary)",
          borderRadius: "var(--roads-radius-xs)", boxShadow: "0 16px 32px rgba(39,51,51,.24)",
        }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          padding: "var(--roads-spacing-component-xl)", borderBottom: "1px solid var(--roads-border-subtle)",
        }}>
          <DialogTitle className="headline-300" style={{ fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "normal" }}>
            Edit Fee
          </DialogTitle>
          <button type="button" onClick={close} disabled={saving} aria-label="Close" data-testid="button-close-edit-fee"
            style={{ ...buttonStyle, width: 32, padding: 8, background: "transparent", color: "var(--roads-icon-dark)" }}>
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        <form onSubmit={event => { event.preventDefault(); void save(); }}
          style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ overflowY: "auto", padding: "var(--roads-spacing-component-xl)", display: "flex", flexDirection: "column", gap: "var(--roads-spacing-component-l)" }}>
            <Field label="Fee">
              <input aria-label="Fee" className="body-100" style={inputStyle} value={draft.fee}
                disabled={saving} onChange={event => change("fee", event.target.value)} data-testid="input-edit-fee" />
            </Field>
            <Field label="Method of Payment">
              <RoadsDropdown value={draft.methodOfPayment} onChange={value => change("methodOfPayment", value)}
                options={paymentOptions} variant="field" ariaLabel="Method of Payment" disabled={saving} testId="select-edit-method-of-payment" />
            </Field>
            <Field label="Paid By">
              <RoadsDropdown value={draft.paidBy} onChange={value => change("paidBy", value)}
                options={paidByOptions} variant="field" ariaLabel="Paid By" disabled={saving} testId="select-edit-paid-by" />
            </Field>
            <Field label="Paid To">
              <input aria-label="Paid To" className="body-100" style={inputStyle} value={draft.paidTo}
                disabled={saving} onChange={event => change("paidTo", event.target.value)} data-testid="input-edit-paid-to" />
            </Field>
            {(["leAmount", "cdAmount"] as const).map(key => <Field key={key} label={key === "leAmount" ? "LE Amount" : "CD Amount"}>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", gap: "var(--roads-spacing-component-xs)" }}>
                <span aria-hidden="true" className="body-100">$</span>
                <input type="text" aria-label={key === "leAmount" ? "LE Amount" : "CD Amount"}
                  className="body-100" value={draft[key]} disabled={saving} onChange={event => change(key, event.target.value)}
                  data-testid={`input-edit-${key === "leAmount" ? "le" : "cd"}-amount`}
                  style={{ width: "100%", minWidth: 0, border: "none", background: "transparent", color: "inherit", fontWeight: 600 }} />
              </div>
            </Field>)}
            <label className="body-100" style={{ display: "flex", alignItems: "center", gap: "var(--roads-spacing-component-xs)" }}>
              <input type="checkbox" checked={draft.shoppedForProvider} disabled={saving}
                onChange={event => change("shoppedForProvider", event.target.checked)} data-testid="checkbox-edit-shopped-for-provider"
                style={{ width: 16, height: 16, accentColor: "var(--roads-bg-action)" }} />
              Shopped for Provider
            </label>
            <Field label="Amount to waive">
              <span className="body-100">The LE and CD amounts above are before the waiver.</span>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--roads-spacing-component-l)", flexWrap: "wrap" }}>
                <div style={{ ...inputStyle, width: 180, display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden="true">$</span>
                  <input aria-label="Amount to waive" inputMode="decimal" value={waiverAmount}
                    disabled={saving || entire} onChange={event => setWaiverAmount(event.target.value)}
                    style={{ width: "100%", border: "none", background: "transparent", color: "inherit" }} />
                </div>
                <label className="body-100" style={{ display: "flex", alignItems: "center", gap: "var(--roads-spacing-component-xs)" }}>
                  <input type="checkbox" checked={entire} disabled={saving}
                    onChange={event => setEntire(event.target.checked)} data-testid="checkbox-edit-waived"
                    style={{ width: 16, height: 16, accentColor: "var(--roads-bg-action)" }} />
                  Waive entire fee
                </label>
              </div>
            </Field>
            {error && <p role="alert" className="body-100" data-testid="text-edit-fee-error" style={{ color: "var(--roads-text-error)" }}>{error}</p>}
          </div>
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: "var(--roads-spacing-component-l)", flexShrink: 0,
            padding: "var(--roads-spacing-component-xl)", borderTop: "1px solid var(--roads-border-subtle)",
          }}>
            <button type="button" disabled={saving} onClick={close} className="label-strong" data-testid="button-cancel-edit-fee"
              style={{ ...buttonStyle, background: "transparent", color: "var(--roads-text-primary)" }}>Cancel</button>
            <button type="submit" disabled={saving} className="label-strong" data-testid="button-save-edit-fee"
              style={{ ...buttonStyle, background: "var(--roads-bg-action)", color: "var(--roads-text-reverse)" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </DialogPrimitive.Content>
    </DialogPortal>
  </Dialog>;
}
