import { useRef, useState, type CSSProperties } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { CIRCUMSTANCE_REASONS, type CircumstanceReason, type CircumstanceRecord } from "@shared/fee-circumstances";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useLoanEditing } from "@/contexts/loan-application-context";
import { RoadsDropdown } from "./RoadsDropdown";

const buttonStyle: CSSProperties = {
  height: 32, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
  borderRadius: "var(--roads-radius-2xs)", border: "none", lineHeight: "16px",
  cursor: "pointer",
};
const fieldStyle: CSSProperties = {
  display: "flex", flexDirection: "column", minWidth: 0,
  gap: "var(--roads-spacing-component-xs)",
};
const options = CIRCUMSTANCE_REASONS.map(({ value, label }) => ({ value, label }));

export function ChangeCircumstanceDialog({ onClose, onSave, record, records, onSelectRecord }: {
  onClose: () => void;
  onSave?: (reason: CircumstanceReason, context: string) => Promise<void>;
  record?: CircumstanceRecord;
  records?: CircumstanceRecord[];
  onSelectRecord?: (id: string) => void;
}) {
  const [reason, setReason] = useState<CircumstanceReason | "">("");
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const readOnly = !!record;
  const trimmedContext = context.trim();
  const valid = reason !== "" && trimmedContext.length >= 1 && trimmedContext.length <= 5000;
  useLoanEditing("change-circumstance", !readOnly && (reason !== "" || context !== "" || saving || !!error));

  function close() {
    if (!submitting.current) onClose();
  }

  async function save() {
    if (submitting.current || readOnly || !onSave) return;
    if (!valid || !reason) {
      setError("Select a reason and enter context between 1 and 5,000 characters.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(reason, trimmedContext);
      onClose();
    } catch (cause) {
      setError(`Change of circumstance not saved. ${cause instanceof Error ? cause.message : "Please try again."}`);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const savedDate = record ? new Date(record.savedAt) : undefined;

  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        aria-busy={saving}
        onEscapeKeyDown={event => { if (submitting.current) event.preventDefault(); }}
        onInteractOutside={event => { if (submitting.current) event.preventDefault(); }}
        data-testid="change-circumstance-dialog"
        style={{
          position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          zIndex: 50, width: "calc(100% - 32px)", maxWidth: 512, maxHeight: "calc(100dvh - 32px)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: "var(--roads-bg-primary)", color: "var(--roads-text-primary)",
          borderRadius: "var(--roads-radius-xs)", boxShadow: "0 16px 32px rgba(39,51,51,.24)",
        }}>
        <style>{`
          .roads-circumstance-reason > div > button {
            height: auto !important; min-height: 40px; gap: 8px; text-align: left;
          }
          .roads-circumstance-reason button,
          .roads-circumstance-reason button > span {
            white-space: normal !important; overflow-wrap: anywhere;
          }
          .roads-circumstance-reason > div > div {
            width: 100%; min-width: 0 !important; max-height: 240px !important;
          }
          .roads-circumstance-reason button > span {
            min-width: 0; overflow: visible !important; text-overflow: clip !important;
          }
          @keyframes roads-circumstance-saving { to { transform: rotate(360deg); } }
          .roads-circumstance-spinner { animation: roads-circumstance-saving 1s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .roads-circumstance-spinner { animation: none; }
          }
        `}</style>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          padding: "var(--roads-spacing-component-xl)", borderBottom: "1px solid var(--roads-border-subtle)",
        }}>
          <DialogTitle className="headline-300" style={{ fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "normal" }}>
            Change of circumstance reason
          </DialogTitle>
          <button type="button" onClick={close} disabled={saving} aria-label="Close" data-testid="button-close-change-circumstance"
            style={{ ...buttonStyle, width: 32, flexShrink: 0, padding: 8, background: "transparent", color: "var(--roads-icon-dark)" }}>
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        <form onSubmit={event => { event.preventDefault(); void save(); }}
          style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ overflowY: "auto", padding: "var(--roads-spacing-component-xl)", display: "flex", flexDirection: "column", gap: "var(--roads-spacing-component-l)" }}>
            {record && records && records.length > 1 && onSelectRecord && <div style={fieldStyle}>
              <span className="label-strong">Saved change</span>
              <RoadsDropdown value={record.id} onChange={onSelectRecord}
                options={[...records].reverse().map((entry, index) => ({
                  value: entry.id, label: `${index === 0 ? "Latest · " : ""}${new Date(entry.savedAt).toLocaleString()}`,
                }))} variant="field" ariaLabel="Saved change" />
            </div>}
            <div style={fieldStyle}>
              <span className="label-strong" style={{ lineHeight: "16px" }}>Reason</span>
              {record ? <p className="body-100" data-testid="text-circumstance-reason" style={{ margin: 0, overflowWrap: "anywhere" }}>
                {CIRCUMSTANCE_REASONS.find(option => option.value === record.reason)?.label ?? record.reason}
              </p> : <div className="roads-circumstance-reason">
                <RoadsDropdown value={reason} onChange={value => {
                  const selected = CIRCUMSTANCE_REASONS.find(option => option.value === value);
                  if (selected) setReason(selected.value);
                }} options={options} placeholder="Select a reason" variant="field" ariaLabel="Reason"
                  disabled={saving} testId="select-circumstance-reason" />
              </div>}
            </div>
            <div style={fieldStyle}>
              <label htmlFor="change-circumstance-context" className="label-strong" style={{ lineHeight: "16px" }}>Context</label>
              <textarea id="change-circumstance-context" className="body-100" value={record ? record.context : context}
                readOnly={readOnly} disabled={saving} required={!readOnly} rows={4}
                onChange={event => setContext(event.target.value)}
                aria-describedby={!readOnly ? "change-circumstance-context-count" : undefined}
                data-testid="input-circumstance-context"
                style={{
                  width: "100%", minWidth: 0, minHeight: 112, resize: "vertical",
                  padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
                  background: "var(--roads-bg-primary)", border: "1px solid var(--roads-border-dark)",
                  borderRadius: "var(--roads-radius-2xs)", color: "var(--roads-text-primary)",
                  lineHeight: "20px", fontWeight: 600,
                }} />
              {!readOnly && <span id="change-circumstance-context-count" className="body-100"
                style={{ color: trimmedContext.length > 5000 ? "var(--roads-text-error)" : "var(--roads-text-secondary)", textAlign: "right" }}>
                {trimmedContext.length.toLocaleString()} / 5,000 characters
              </span>}
            </div>
            {record && <div style={fieldStyle}>
              <span className="label-strong" style={{ lineHeight: "16px" }}>Saved</span>
              <time className="body-100" dateTime={record.savedAt} data-testid="text-circumstance-saved-at">
                {savedDate && !Number.isNaN(savedDate.getTime()) ? savedDate.toLocaleString(undefined, {
                  year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                }) : record.savedAt}
              </time>
            </div>}
            <p className="body-100" style={{ margin: 0, color: "var(--roads-text-secondary)", lineHeight: "20px" }}>
              Selecting a reason alone does not establish TRID eligibility. Interest rate dependent charges apply only to rate-related fees.
              {" "}Source: Regulation Z, 12 CFR 1026.19(e)(3)(iv)(A)–(F).
            </p>
            {error && <p role="alert" className="body-100" data-testid="text-circumstance-error"
              style={{ margin: 0, color: "var(--roads-text-error)" }}>{error}</p>}
          </div>
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: "var(--roads-spacing-component-l)", flexShrink: 0,
            padding: "var(--roads-spacing-component-xl)", borderTop: "1px solid var(--roads-border-subtle)",
          }}>
            <button type="button" disabled={saving} onClick={close} className="label-strong" data-testid="button-cancel-change-circumstance"
              style={{ ...buttonStyle, background: "transparent", color: "var(--roads-text-primary)" }}>
              {readOnly ? "Back to controls" : "Cancel"}
            </button>
            {!readOnly && <button type="submit" disabled={saving || !valid || !onSave} className="label-strong"
              data-testid="button-save-change-circumstance"
              style={{
                ...buttonStyle, background: "var(--roads-bg-action)", color: "var(--roads-text-reverse)",
                display: "inline-flex", alignItems: "center", gap: "var(--roads-spacing-component-xs)",
                opacity: saving || !valid || !onSave ? 0.6 : 1, cursor: saving || !valid || !onSave ? "default" : "pointer",
              }}>
              {saving && <Loader2 size={16} aria-hidden="true" className="roads-circumstance-spinner" />}
              <span role="status">{saving ? "Saving…" : "Save"}</span>
            </button>}
          </div>
        </form>
      </DialogPrimitive.Content>
    </DialogPortal>
  </Dialog>;
}
