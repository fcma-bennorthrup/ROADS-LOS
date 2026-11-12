import { useState, type CSSProperties, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { CREDIT_TYPES, normalizeCreditAmount, type CreditRow } from "@shared/credits";
import { currencyAmount } from "@shared/loan-collateral-value";
import { useLoanState, useLoanEditing } from "@/contexts/loan-application-context";
import { applicationStore } from "@/lib/loan-application-store";
import { toast } from "@/hooks/use-toast";
import { RoadsDropdown } from "./RoadsDropdown";

const creditOptions = CREDIT_TYPES.map(value => ({ value, label: value }));
const inputStyle: CSSProperties = {
  width: "100%", minWidth: 0, height: 40,
  padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
  background: "var(--roads-bg-primary)", border: "1px solid var(--roads-border-dark)",
  borderRadius: "var(--roads-radius-2xs)", color: "var(--roads-text-primary)",
  lineHeight: "20px", fontWeight: 600,
};
const buttonStyle: CSSProperties = {
  height: 32, borderRadius: "var(--roads-radius-2xs)",
  padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
  cursor: "pointer", whiteSpace: "nowrap", lineHeight: "16px",
};
const cellStyle: CSSProperties = {
  minWidth: 0, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
  color: "var(--roads-text-primary)", lineHeight: "24px", overflowWrap: "anywhere",
};
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
function displayCurrency(value: string) {
  const amount = currencyAmount(value);
  return amount === null ? value : currencyFormatter.format(amount);
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--roads-spacing-component-xs)" }}>
    <span className="label-strong" style={{ color: "var(--roads-text-primary)", lineHeight: "16px" }}>{label}</span>
    {children}
  </div>;
}

export function CreditsContent() {
  const [credits, setCredits] = useLoanState<CreditRow[]>("credits", []);
  const [creditType, setCreditType] = useState("");
  const [cdAmount, setCdAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const editing = !!(creditType || cdAmount || description);
  useLoanEditing("credit-editor", editing);

  function handleAddCredit() {
    if (!creditType) return;
    const amount = normalizeCreditAmount(cdAmount);
    if (amount === null) {
      setFeedback("Enter a valid, non-negative CD Amount.");
      return;
    }
    try {
      setCredits(previous => [...previous, {
        id: crypto.randomUUID(), creditType: creditType as CreditRow["creditType"],
        cdAmount: amount, description: description.trim(),
      }]);
      setCreditType("");
      setCdAmount("");
      setDescription("");
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to add credit.");
    }
  }

  function updateCredits(next: CreditRow[]) {
    try {
      setCredits(next);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete credits.");
    }
  }

  async function handleSaveCreditTable() {
    setSaving(true);
    setFeedback(null);
    try {
      await applicationStore.flush();
      toast({
        variant: "success", title: "Credit table saved.",
        description: editing ? "Add the current credit to include it in the table." : "Your credit changes have been saved.",
        duration: 5000,
      });
    } catch (error) {
      setFeedback(`Credit table not saved. ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      setSaving(false);
    }
  }

  return <div className="flex flex-col"
    style={{ padding: "var(--roads-spacing-component-xl)", flex: 1, minHeight: 0, minWidth: 0 }}
    data-testid="credits-content">
    <style>{`
      .roads-credits-fields {
        display: flex; flex-wrap: wrap; align-items: center;
        gap: var(--roads-spacing-component-3xl);
      }
      .roads-credits-fields > div { flex: 0 1 294px; }
      .roads-credits-fields button[aria-expanded] {
        padding: var(--roads-spacing-component-s) var(--roads-spacing-component-m) !important;
      }
      .roads-credits-table-row {
        display: grid;
        grid-template-columns: minmax(240px, 1.6fr) 180px minmax(200px, 1fr) 76px;
        min-width: 696px;
      }
      @media (max-width: 767px) {
        .roads-credits-fields { gap: var(--roads-spacing-component-l); }
        .roads-credits-fields > div { flex-basis: 100%; }
      }
    `}</style>
    <h2 className="headline-300"
      style={{ color: "var(--roads-text-primary)", lineHeight: "32px", marginBottom: "var(--roads-spacing-component-l)" }}
      data-testid="text-credits-title">Credits</h2>
    <div className="roads-credits-fields" data-testid="credits-field-row">
      <Field label="Credit Type">
        <RoadsDropdown value={creditType} onChange={setCreditType} options={creditOptions}
          placeholder="Select credit type" variant="field" ariaLabel="Credit Type" testId="select-credit-type" />
      </Field>
      <Field label="CD Amount">
        <div className="flex items-center" style={{ ...inputStyle, gap: "var(--roads-spacing-component-xs)" }}>
          <span className="body-100" style={{ width: 16, flexShrink: 0, textAlign: "center", color: "var(--roads-icon-dark)" }}>$</span>
          <input type="text" aria-label="CD Amount" value={cdAmount} onChange={event => setCdAmount(event.target.value)}
            className="body-100" placeholder="0.00" data-testid="input-credit-cd-amount"
            style={{ flex: 1, width: 0, minWidth: 0, border: "none", outline: "none",
              background: "transparent", color: "var(--roads-text-primary)", padding: 0, lineHeight: "20px", fontWeight: 600 }} />
        </div>
      </Field>
      <Field label="Description">
        <input type="text" aria-label="Description" value={description} onChange={event => setDescription(event.target.value)}
          className="body-100" style={inputStyle} placeholder="Text field" data-testid="input-credit-description" />
      </Field>
    </div>
    <div className="flex flex-wrap items-center justify-end"
      style={{ gap: "var(--roads-spacing-component-l)", marginTop: "var(--roads-spacing-component-l)" }}
      data-testid="credits-actions">
      {feedback && <span role="alert" className="body-100" data-testid="text-credit-error"
        style={{ marginRight: "auto", color: "var(--roads-text-error)" }}>{feedback}</span>}
      <button type="button" onClick={handleAddCredit} className="label-strong" data-testid="button-add-credit"
        style={{ ...buttonStyle, background: "var(--roads-bg-action)", color: "var(--roads-text-reverse)", border: "none" }}>Add Credit</button>
      <button type="button" onClick={handleSaveCreditTable} disabled={saving} className="label-strong" data-testid="button-save-credit-table"
        style={{ ...buttonStyle, background: "var(--roads-bg-primary)", color: "var(--roads-text-primary)", border: "1px solid var(--roads-border-dark)" }}>
        {saving ? "Saving credit table…" : "Save Credit Table"}
      </button>
      <button type="button" onClick={() => updateCredits([])} className="label-strong" data-testid="button-delete-all-credits"
        style={{ ...buttonStyle, background: "var(--roads-bg-error)", color: "var(--roads-text-reverse)", border: "none" }}>Delete All Credits</button>
    </div>
    <div className="flex flex-col" role="table" aria-label="Credits" data-testid="credits-table"
      style={{ backgroundColor: "var(--roads-bg-primary)", border: "1px solid var(--roads-border-subtle)",
        borderRadius: "var(--roads-radius-xs)", overflow: "auto", flex: 1, marginTop: "var(--roads-spacing-component-xl)" }}>
      <div className="roads-credits-table-row" role="row" style={{ backgroundColor: "var(--roads-bg-light)" }}>
        <div role="columnheader" className="label-strong" style={cellStyle}>Credit Type</div>
        <div role="columnheader" className="label-strong" style={{ ...cellStyle, textAlign: "right" }}>CD Amount</div>
        <div role="columnheader" className="label-strong" style={cellStyle}>Description</div>
        <div role="columnheader" aria-label="Actions" />
      </div>
      {credits.map(credit => <div key={credit.id} className="roads-credits-table-row" role="row"
        style={{ borderTop: "1px solid var(--roads-border-subtle)" }} data-testid={`credit-row-${credit.id}`}>
        <div role="cell" className="body-100" style={cellStyle}>{credit.creditType}</div>
        <div role="cell" style={{ ...cellStyle, fontFamily: "var(--font-mono)", fontSize: 14,
          lineHeight: "16px", fontVariantNumeric: "tabular-nums", textAlign: "right",
          display: "flex", alignItems: "center", justifyContent: "flex-end", whiteSpace: "nowrap" }}>{displayCurrency(credit.cdAmount)}</div>
        <div role="cell" className="body-100" style={cellStyle}>{credit.description}</div>
        <div role="cell" className="flex items-center justify-center" style={{ padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)" }}>
          <button type="button" onClick={() => updateCredits(credits.filter(row => row.id !== credit.id))}
            aria-label={`Delete ${credit.creditType}`} data-testid={`button-delete-credit-${credit.id}`}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--roads-text-error)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <Trash2 aria-hidden="true" style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>)}
      <div data-testid="credits-table-footer" style={{ backgroundColor: "var(--roads-bg-light)", minWidth: 696,
        height: 56, flexShrink: 0, borderTop: "1px solid var(--roads-border-subtle)", marginTop: "auto" }} />
    </div>
  </div>;
}
