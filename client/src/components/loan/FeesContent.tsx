import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, Trash2 } from "lucide-react";
import type { FeeRow } from "@shared/fees";
import { useLoanState, useLoanEditing } from "@/contexts/loan-application-context";
import { applicationStore } from "@/lib/loan-application-store";
import { RoadsDropdown } from "./RoadsDropdown";

const FEE_OPTIONS = [
  "Appraisal Fee",
  "Credit Report Fee",
  "Flood Certification Fee",
  "Origination Fee",
  "Processing Fee",
  "Recording Fee",
  "Tax Service Fee",
  "Title Insurance Fee",
  "Title Search Fee",
  "Underwriting Fee",
].map((fee) => ({ value: fee, label: fee }));
const METHOD_OPTIONS = ["Financed", "Cash"].map((value) => ({ value, label: value }));
const PAID_BY_OPTIONS = ["Buyer", "Seller"].map((value) => ({ value, label: value }));

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 40,
  padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
  background: "var(--roads-bg-primary)",
  border: "1px solid var(--roads-border-dark)",
  borderRadius: "var(--roads-radius-2xs)",
  color: "var(--roads-text-primary)",
  lineHeight: "20px",
  fontWeight: 600,
};
const buttonStyle: CSSProperties = {
  height: 32,
  borderRadius: "var(--roads-radius-2xs)",
  padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: "16px",
};
const cellStyle: CSSProperties = {
  minWidth: 0,
  padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
  color: "var(--roads-text-primary)",
  lineHeight: "24px",
  overflowWrap: "anywhere",
};
const columns = [
  ["fee", "Fee"],
  ["method", "Method of Payment"],
  ["paid-by", "Paid By"],
  ["paid-to", "Paid To"],
  ["le-amount", "LE Amount"],
  ["cd-amount", "CD Amount"],
  ["shopped", "Shopped"],
] as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--roads-spacing-component-xs)" }}>
      <span className="label-strong" style={{ color: "var(--roads-text-primary)", lineHeight: "16px" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function CurrencyInput({
  label, value, onChange, testId,
}: { label: string; value: string; onChange: (value: string) => void; testId: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center" style={{ ...inputStyle, gap: "var(--roads-spacing-component-xs)" }}>
        <span className="body-100" style={{ width: 16, flexShrink: 0, textAlign: "center", color: "var(--roads-icon-dark)" }}>$</span>
        <input
          type="text"
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="body-100"
          style={{
            flex: 1, width: 0, minWidth: 0, border: "none", outline: "none",
            background: "transparent", color: "var(--roads-text-primary)", padding: 0, lineHeight: "20px", fontWeight: 600,
          }}
          placeholder="0.00"
          data-testid={testId}
        />
      </div>
    </Field>
  );
}

export function FeesContent() {
  const [fees, setFees] = useLoanState<FeeRow[]>("fees", []);
  const [feeType, setFeeType] = useState("");
  const [methodOfPayment, setMethodOfPayment] = useState("Cash");
  const [paidBy, setPaidBy] = useState("Buyer");
  const [paidTo, setPaidTo] = useState("");
  const [leAmount, setLeAmount] = useState("");
  const [cdAmount, setCdAmount] = useState("");
  const [shoppedForProvider, setShoppedForProvider] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const editing = !!(feeType || leAmount || cdAmount || paidTo || shoppedForProvider ||
    methodOfPayment !== "Cash" || paidBy !== "Buyer");
  useLoanEditing("fee-editor", editing);

  function handleAddFee() {
    if (!feeType) return;
    try {
      setFees((previous) => [...previous, {
        id: crypto.randomUUID(), fee: feeType, methodOfPayment, paidBy, paidTo,
        leAmount: leAmount || "0.00", cdAmount: cdAmount || "0.00", shoppedForProvider,
      }]);
      setFeeType("");
      setMethodOfPayment("Cash");
      setPaidBy("Buyer");
      setPaidTo("");
      setLeAmount("");
      setCdAmount("");
      setShoppedForProvider(false);
      setFeedback(null);
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Unable to add fee." });
    }
  }

  function updateFees(next: FeeRow[]) {
    try {
      setFees(next);
      setFeedback(null);
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Unable to delete fees." });
    }
  }

  async function handleSaveFeeTable() {
    setSaving(true);
    setFeedback(null);
    try {
      await applicationStore.flush();
      setFeedback({
        error: false,
        message: editing ? "Fee table saved. Add the current fee to include it in the table." : "Fee table saved.",
      });
    } catch (error) {
      setFeedback({
        error: true,
        message: `Fee table not saved. ${error instanceof Error ? error.message : "Please try again."}`,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="flex flex-col"
      style={{ padding: "var(--roads-spacing-component-xl)", flex: 1, minHeight: 0, minWidth: 0 }}
      data-testid="fees-content"
    >
      <style>{`
        .roads-fees-fields {
          display: flex;
          flex-wrap: wrap;
          gap: var(--roads-spacing-component-3xl);
          align-items: center;
        }
        .roads-fees-fields > div { flex: 1 0 0; }
        .roads-fees-fields > label { flex: 0 0 167px; }
        .roads-fees-fields button[aria-expanded] {
          padding: var(--roads-spacing-component-s) var(--roads-spacing-component-m) !important;
        }
        .roads-fees-table-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr)) 180px 180px 94px 80px;
          min-width: 1100px;
        }
        @media (max-width: 1200px) {
          .roads-fees-fields > div { flex-basis: calc((100% - 2 * var(--roads-spacing-component-3xl)) / 3); }
        }
        @media (max-width: 767px) {
          .roads-fees-fields { gap: var(--roads-spacing-component-l); }
          .roads-fees-fields > div { flex-basis: 100%; }
        }
      `}</style>
      <h2
        className="headline-300"
        style={{ color: "var(--roads-text-primary)", lineHeight: "32px", marginBottom: "var(--roads-spacing-component-l)" }}
        data-testid="text-fees-title"
      >
        Fees
      </h2>

      <div className="roads-fees-fields" data-testid="fees-field-row">
        <Field label="Fee">
          <RoadsDropdown value={feeType} onChange={setFeeType} options={FEE_OPTIONS}
            placeholder="Select fee" variant="field" ariaLabel="Fee" testId="select-fee-type" />
        </Field>
        <Field label="Method of Payment">
          <RoadsDropdown value={methodOfPayment} onChange={setMethodOfPayment} options={METHOD_OPTIONS}
            variant="field" ariaLabel="Method of Payment" testId="select-method-of-payment" />
        </Field>
        <Field label="Paid By">
          <RoadsDropdown value={paidBy} onChange={setPaidBy} options={PAID_BY_OPTIONS}
            variant="field" ariaLabel="Paid By" testId="select-paid-by" />
        </Field>
        <Field label="Paid To">
          <input type="text" aria-label="Paid To" value={paidTo} onChange={(event) => setPaidTo(event.target.value)}
            className="body-100" style={inputStyle} placeholder="Text field" data-testid="input-paid-to" />
        </Field>
        <CurrencyInput label="LE Amount" value={leAmount} onChange={setLeAmount} testId="input-le-amount" />
        <CurrencyInput label="CD Amount" value={cdAmount} onChange={setCdAmount} testId="input-cd-amount" />
        <label className="flex items-end body-100"
          style={{ height: 40, gap: "var(--roads-spacing-component-xs)", color: "var(--roads-text-primary)", cursor: "pointer", lineHeight: "16px", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={shoppedForProvider}
            onChange={(event) => setShoppedForProvider(event.target.checked)}
            data-testid="checkbox-shopped-for-provider"
            style={{
              width: "var(--roads-spacing-component-l)", height: "var(--roads-spacing-component-l)",
              border: "1px solid var(--roads-border-dark)", borderRadius: "var(--roads-radius-2xs)",
              accentColor: "var(--roads-bg-action)", cursor: "pointer", flexShrink: 0,
            }} />
          Shopped for Provider
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end"
        style={{ gap: "var(--roads-spacing-component-l)", marginTop: "var(--roads-spacing-component-l)" }}
        data-testid="fees-actions">
        {feedback && <span role={feedback.error ? "alert" : "status"} className="body-100"
          style={{ marginRight: "auto", color: feedback.error ? "var(--roads-text-error)" : "var(--roads-text-primary)" }}>
          {feedback.message}
        </span>}
        <button type="button" onClick={() => updateFees([])} className="label-strong"
          style={{ ...buttonStyle, background: "var(--roads-bg-error)", color: "var(--roads-text-reverse)", border: "none" }}
          data-testid="button-delete-all-fees">Delete All Fees</button>
        <button type="button" onClick={handleSaveFeeTable} disabled={saving} className="label-strong"
          style={{ ...buttonStyle, background: "var(--roads-bg-primary)", color: "var(--roads-text-primary)", border: "1px solid var(--roads-border-dark)" }}
          data-testid="button-save-fee-table">{saving ? "Saving fee table…" : "Save Fee Table"}</button>
        <button type="button" onClick={handleAddFee} className="label-strong"
          style={{ ...buttonStyle, background: "var(--roads-bg-action)", color: "var(--roads-text-reverse)", border: "none" }}
          data-testid="button-add-fee">Add Fee</button>
      </div>

      <div className="flex flex-col"
        style={{
          backgroundColor: "var(--roads-bg-primary)", border: "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-xs)", overflow: "auto", flex: 1,
          marginTop: "var(--roads-spacing-component-xl)",
        }}
        role="table" aria-label="Fees" data-testid="fees-table">
        <div className="roads-fees-table-row" role="row" style={{ backgroundColor: "var(--roads-bg-light)" }}>
          {columns.map(([key, label]) => <div key={key} role="columnheader" className="label-strong"
            style={{ ...cellStyle, textAlign: key === "shopped" ? "center" : undefined }} data-testid={`th-${key}`}>{label}</div>)}
          <div role="columnheader" aria-label="Delete fee" />
        </div>
        {fees.map((fee) => (
          <div key={fee.id} className="roads-fees-table-row" role="row"
            style={{ borderTop: "1px solid var(--roads-border-subtle)" }} data-testid={`fee-row-${fee.id}`}>
            <div role="cell" className="body-100" style={cellStyle}>{fee.fee}</div>
            <div role="cell" className="body-100" style={cellStyle}>{fee.methodOfPayment}</div>
            <div role="cell" className="body-100" style={cellStyle}>{fee.paidBy}</div>
            <div role="cell" className="body-100" style={cellStyle}>{fee.paidTo ?? ""}</div>
            <div role="cell" className="body-100" style={{ ...cellStyle, textAlign: "right" }}>${fee.leAmount}</div>
            <div role="cell" className="body-100" style={{ ...cellStyle, textAlign: "right" }}>${fee.cdAmount}</div>
            <div role="cell" className="flex items-center justify-center" aria-label={fee.shoppedForProvider ? "Shopped for Provider" : "Not shopped for Provider"}>
              {fee.shoppedForProvider && <Check aria-hidden="true" style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} data-testid={`fee-shopped-${fee.id}`} />}
            </div>
            <div role="cell" className="flex items-center justify-center">
              <button type="button" onClick={() => updateFees(fees.filter((row) => row.id !== fee.id))}
                aria-label={`Delete ${fee.fee}`}
                style={{
                  background: "none", border: "none", cursor: "pointer", color: "var(--roads-text-error)",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--roads-spacing-component-2xs)",
                }}
                data-testid={`button-delete-fee-${fee.id}`}>
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        ))}
        <div style={{
          backgroundColor: "var(--roads-bg-light)", minWidth: 1100,
          height: 56, flexShrink: 0, borderTop: "1px solid var(--roads-border-subtle)", marginTop: "auto",
        }} data-testid="fees-table-footer" />
      </div>
    </div>
  );
}
