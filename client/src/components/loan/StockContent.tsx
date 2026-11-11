import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { useLoanDraft } from "@/contexts/loan-application-context";
import { applicationStore } from "@/lib/loan-application-store";
import { RoadsDropdown } from "./RoadsDropdown";

export function StockContent() {
  const borrowers = applicationStore.document?.borrowers ?? [];
  const options = borrowers.map((borrower, index) => {
    const section = applicationStore.document?.sections[index === 0 ? "borrower-primary" : "borrower-secondary"] as Record<string, unknown> | undefined;
    const name = [section?.firstName, section?.lastName].filter(Boolean).join(" ");
    return { value: borrower.id, label: name || borrower.name };
  });
  const primaryId = borrowers.find(borrower => borrower.isPrimary)?.id ?? borrowers[0]?.id ?? "";
  const [fields, setFields, saveFields] = useLoanDraft("stock", { voterId: primaryId }, { voterId: primaryId });
  const [editing, setEditing] = useState(false);
  const saved = useRef(fields);
  const buttonStyle = {
    borderRadius: "var(--roads-radius-2xs)",
    padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
    border: "1px solid var(--roads-border-dark)",
    backgroundColor: "var(--roads-bg-primary)",
    color: "var(--roads-text-primary)",
    cursor: "pointer",
  };
  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="stock-content"
    >
      <h2 className="headline-200" style={{ color: "var(--roads-text-primary)" }}>
        Stock Voter
      </h2>
      <div className="flex flex-col" style={{ width: 288, maxWidth: "100%", gap: "var(--roads-spacing-component-xl)" }}>
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>Stock Voter</span>
          <RoadsDropdown
            value={fields.voterId}
            onChange={voterId => setFields({ voterId })}
            options={options}
            disabled={!editing}
            ariaLabel="Stock Voter"
            testId="select-stock-voter"
            variant="field"
          />
        </div>
        <div className="flex items-center justify-end" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          {editing ? <>
            <button className="body-200-strong" style={{ ...buttonStyle, backgroundColor: "var(--roads-bg-error)", color: "var(--roads-text-reverse)", borderColor: "var(--roads-bg-error)" }}
              onClick={() => { setFields(saved.current); setEditing(false); }}>Discard Changes</button>
            <button className="body-200-strong" style={{ ...buttonStyle, backgroundColor: "var(--roads-bg-action)", color: "var(--roads-text-reverse)", borderColor: "var(--roads-bg-action)" }}
              onClick={() => { saveFields(); saved.current = fields; setEditing(false); }}>Save</button>
          </> : <button className="body-200-strong flex items-center" style={{ ...buttonStyle, gap: "var(--roads-spacing-component-2xs)" }}
            onClick={() => { saved.current = fields; setEditing(true); }}>
            <Pencil size={12} />Edit
          </button>}
        </div>
      </div>
    </div>
  );
}
