import { useState } from "react";
import { Trash2 } from "lucide-react";
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
];

const FEE_DROPDOWN_OPTIONS = FEE_OPTIONS.map((f) => ({ value: f, label: f }));

interface FeeRow {
  id: string;
  fee: string;
  leAmount: string;
  cdAmount: string;
  methodOfPayment: string;
  paidBy: string;
}

function CurrencyInput({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
}) {
  return (
    <div className="flex flex-col" style={{ width: 294, gap: "var(--roads-spacing-component-xs)" }}>
      <span
        className="label-strong"
        style={{ color: "var(--roads-text-primary)", lineHeight: "16px" }}
      >
        {label}
      </span>
      <div
        className="flex items-center"
        style={{
          backgroundColor: "var(--roads-bg-primary)",
          border: "1px solid var(--roads-border-dark)",
          borderRadius: "var(--roads-radius-2xs)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          gap: "var(--roads-spacing-component-2xs)",
          height: 44,
        }}
      >
        <span className="body-100" style={{ color: "var(--roads-text-secondary)" }}>$</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="body-100"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--roads-text-primary)",
            padding: 0,
            lineHeight: "20px",
          }}
          placeholder="0.00"
          data-testid={testId}
        />
      </div>
    </div>
  );
}

export function FeesContent() {
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [feeType, setFeeType] = useState("");
  const [leAmount, setLeAmount] = useState("");
  const [cdAmount, setCdAmount] = useState("");

  function handleAddFee() {
    if (!feeType) return;
    const newFee: FeeRow = {
      id: String(Date.now()),
      fee: feeType,
      leAmount: leAmount || "0.00",
      cdAmount: cdAmount || "0.00",
      methodOfPayment: "Cash",
      paidBy: "Buyer",
    };
    setFees((prev) => [...prev, newFee]);
    setFeeType("");
    setLeAmount("");
    setCdAmount("");
  }

  function handleDeleteFee(id: string) {
    setFees((prev) => prev.filter((f) => f.id !== id));
  }

  function handleDeleteAll() {
    setFees([]);
  }

  return (
    <div
      className="flex flex-col"
      style={{ padding: "var(--roads-spacing-component-xl)", gap: "var(--roads-spacing-component-xl)", flex: 1, minHeight: 0 }}
      data-testid="fees-content"
    >
      <h2
        className="headline-300"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-fees-title"
      >
        Fees
      </h2>

      <div
        className="flex flex-wrap items-end"
        style={{ gap: "var(--roads-spacing-component-3xl)" }}
      >
        <div className="flex flex-col" style={{ width: 294, gap: "var(--roads-spacing-component-xs)" }}>
          <span className="label-strong" style={{ color: "var(--roads-text-primary)", lineHeight: "16px" }}>Fee</span>
          <RoadsDropdown
            value={feeType}
            onChange={setFeeType}
            options={FEE_DROPDOWN_OPTIONS}
            placeholder="Select fee"
            testId="select-fee-type"
          />
        </div>
        <CurrencyInput label="LE Amount" value={leAmount} onChange={setLeAmount} testId="input-le-amount" />
        <CurrencyInput label="CD Amount" value={cdAmount} onChange={setCdAmount} testId="input-cd-amount" />
      </div>

      <div className="flex items-center justify-end" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <button
          onClick={handleAddFee}
          className="label-strong"
          style={{
            backgroundColor: "var(--roads-bg-action)",
            color: "var(--roads-text-reverse)",
            border: "none",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          data-testid="button-add-fee"
        >
          Add Fee
        </button>
        <button
          className="label-strong"
          style={{
            backgroundColor: "var(--roads-bg-primary)",
            color: "var(--roads-text-primary)",
            border: "1px solid var(--roads-border-dark)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          data-testid="button-save-fee-table"
        >
          Save Fee Table
        </button>
        <button
          onClick={handleDeleteAll}
          className="label-strong"
          style={{
            backgroundColor: "var(--roads-bg-error)",
            color: "var(--roads-text-reverse)",
            border: "none",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          data-testid="button-delete-all-fees"
        >
          Delete All Fees
        </button>
      </div>

      <div
        className="flex flex-col"
        style={{
          backgroundColor: "var(--roads-bg-primary)",
          border: "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-xs)",
          overflow: "hidden",
          flex: 1,
        }}
        data-testid="fees-table"
      >
        <div
          className="flex"
          style={{ backgroundColor: "var(--roads-bg-light)" }}
        >
          <div className="label-strong" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }} data-testid="th-fee">Fee</div>
          <div className="label-strong" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }} data-testid="th-le-amount">LE Amount</div>
          <div className="label-strong" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }} data-testid="th-cd-amount">CD Amount</div>
          <div className="label-strong" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }} data-testid="th-method">Method of Payment</div>
          <div className="label-strong" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }} data-testid="th-paid-by">Paid By</div>
          <div style={{ width: 80 }} />
        </div>

        {fees.map((fee) => (
          <div
            key={fee.id}
            className="flex"
            style={{ borderTop: "1px solid var(--roads-border-subtle)" }}
            data-testid={`fee-row-${fee.id}`}
          >
            <div className="body-100" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }}>{fee.fee}</div>
            <div className="body-100" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }}>${fee.leAmount}</div>
            <div className="body-100" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }}>${fee.cdAmount}</div>
            <div className="body-100" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }}>{fee.methodOfPayment}</div>
            <div className="body-100" style={{ flex: 1, padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)", color: "var(--roads-text-primary)", lineHeight: "24px" }}>{fee.paidBy}</div>
            <div className="flex items-center justify-center" style={{ width: 80 }}>
              <button
                onClick={() => handleDeleteFee(fee.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--roads-text-error)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "var(--roads-spacing-component-2xs)",
                }}
                data-testid={`button-delete-fee-${fee.id}`}
              >
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        ))}

        <div
          style={{
            backgroundColor: "var(--roads-bg-light)",
            padding: "var(--roads-spacing-component-l)",
            borderTop: "1px solid var(--roads-border-subtle)",
            marginTop: "auto",
          }}
          data-testid="fees-table-footer"
        />
      </div>
    </div>
  );
}
