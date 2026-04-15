import { useState, useRef } from "react";
import { Pencil } from "lucide-react";
import { RoadsDropdown } from "./RoadsDropdown";

function LoanDetailField({
  label,
  value,
  displayValue,
  isEditing,
  type,
  options,
  onChange,
}: {
  label: string;
  value: string;
  displayValue?: string;
  isEditing: boolean;
  type?: "text" | "dropdown";
  options?: { value: string; label: string }[];
  onChange?: (value: string) => void;
}) {
  const testId = label.toLowerCase().replace(/[\s()]+/g, "-");
  return (
    <div
      className="flex flex-col"
      style={{ flex: "1 1 0", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`loan-detail-field-${testId}`}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {label}
      </span>
      {type === "dropdown" && isEditing ? (
        <RoadsDropdown
          value={value}
          onChange={(v) => onChange?.(v)}
          options={(options || []).map((o) => ({ value: o.value, label: o.label }))}
          testId={`select-${testId}`}
        />
      ) : isEditing && type === "text" ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full outline-none label-strong"
          style={{
            backgroundColor: "var(--roads-bg-primary)",
            border: "1px solid var(--roads-border-dark)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
            color: "var(--roads-text-primary)",
          }}
          data-testid={`input-${testId}`}
        />
      ) : (
        <div
          className="flex items-center w-full"
          style={{
            backgroundColor: "var(--roads-bg-light)",
            border: "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          }}
        >
          <span
            className="label-strong"
            style={{ flex: 1, color: "var(--roads-text-primary)", display: "block" }}
          >
            {displayValue || value || "\u00A0"}
          </span>
        </div>
      )}
    </div>
  );
}

interface LoanDetailsState {
  loanType: string;
  loanPurpose: string;
  requestedLoanAmount: string;
  downPaymentAmount: string;
  downPaymentSource: string;
  tellTheStory: string;
  intentToProceed: boolean;
  brpLoan: boolean;
}

const LOAN_TYPE_OPTIONS = [
  { value: "purchase", label: "Purchase" },
  { value: "construction", label: "Construction" },
  { value: "cash_out", label: "Cash Out" },
  { value: "refinance", label: "Refinance" },
];

const LOAN_PURPOSE_OPTIONS = [
  { value: "primary_dwelling", label: "Primary Dwelling" },
  { value: "land_lot", label: "Land/Lot" },
  { value: "other", label: "Other" },
];

const DOWN_PAYMENT_SOURCE_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "cash_on_hand", label: "Cash on hand" },
  { value: "savings", label: "Savings" },
  { value: "gift", label: "Gift" },
  { value: "sale_of_property", label: "Sale of Property" },
  { value: "401k", label: "401(k)" },
  { value: "other", label: "Other" },
];

interface LoanDetailsContentProps {
  initialRequestedLoanAmount?: string;
}

export function LoanDetailsContent({ initialRequestedLoanAmount = "" }: LoanDetailsContentProps) {
  const defaultState: LoanDetailsState = {
    loanType: "purchase",
    loanPurpose: "land_lot",
    requestedLoanAmount: initialRequestedLoanAmount,
    downPaymentAmount: "$50,000.00",
    downPaymentSource: "cash_on_hand",
    tellTheStory: "",
    intentToProceed: false,
    brpLoan: false,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<LoanDetailsState>({ ...defaultState });
  const savedFields = useRef<LoanDetailsState>({ ...defaultState });

  const handleEditToggle = () => {
    if (!isEditing) {
      savedFields.current = { ...fields };
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    savedFields.current = { ...fields };
    setIsEditing(false);
  };

  const handleDiscard = () => {
    setFields({ ...savedFields.current });
    setIsEditing(false);
  };

  const setField = <K extends keyof LoanDetailsState>(key: K) => (value: LoanDetailsState[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const getLoanTypeLabel = (val: string) =>
    LOAN_TYPE_OPTIONS.find((o) => o.value === val)?.label ?? val;

  const getLoanPurposeLabel = (val: string) =>
    LOAN_PURPOSE_OPTIONS.find((o) => o.value === val)?.label ?? val;

  const getDownPaymentSourceLabel = (val: string) =>
    val === "" ? "" : (DOWN_PAYMENT_SOURCE_OPTIONS.find((o) => o.value === val)?.label ?? val);

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="loan-details-content"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-loan-details-title"
      >
        Loan Details
      </h2>

      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>

        {/* Fields row + checkboxes: 16px between them */}
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <div className="flex" style={{ gap: "var(--roads-spacing-component-l)" }}>
            <LoanDetailField
              label="Loan Type"
              value={fields.loanType}
              displayValue={getLoanTypeLabel(fields.loanType)}
              isEditing={isEditing}
              type="dropdown"
              options={LOAN_TYPE_OPTIONS}
              onChange={setField("loanType")}
            />
            <LoanDetailField
              label="Loan Purpose"
              value={fields.loanPurpose}
              displayValue={getLoanPurposeLabel(fields.loanPurpose)}
              isEditing={isEditing}
              type="dropdown"
              options={LOAN_PURPOSE_OPTIONS}
              onChange={setField("loanPurpose")}
            />
            <LoanDetailField
              label="Requested Loan Amount"
              value={fields.requestedLoanAmount}
              isEditing={isEditing}
              type="text"
              onChange={setField("requestedLoanAmount")}
            />
            <LoanDetailField
              label="Down Payment Amount"
              value={fields.downPaymentAmount}
              isEditing={isEditing}
              type="text"
              onChange={setField("downPaymentAmount")}
            />
            <LoanDetailField
              label="Down Payment Source"
              value={fields.downPaymentSource}
              displayValue={getDownPaymentSourceLabel(fields.downPaymentSource)}
              isEditing={isEditing}
              type="dropdown"
              options={DOWN_PAYMENT_SOURCE_OPTIONS}
              onChange={setField("downPaymentSource")}
            />
          </div>

          <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xl)" }}>
            <label
              className="flex items-center body-100"
              style={{
                gap: "var(--roads-spacing-component-xs)",
                color: isEditing ? "var(--roads-text-primary)" : "var(--roads-text-secondary)",
                cursor: isEditing ? "pointer" : "default",
              }}
              data-testid="checkbox-intent-to-proceed"
            >
              <input
                type="checkbox"
                checked={fields.intentToProceed}
                onChange={(e) => setField("intentToProceed")(e.target.checked)}
                disabled={!isEditing}
                style={{
                  width: "var(--roads-spacing-component-l)",
                  height: "var(--roads-spacing-component-l)",
                  border: isEditing ? "1px solid var(--roads-border-dark)" : "1px solid var(--roads-border-subtle)",
                  borderRadius: "var(--roads-radius-2xs)",
                  accentColor: "var(--roads-bg-action)",
                  cursor: isEditing ? "pointer" : "default",
                  flexShrink: 0,
                }}
              />
              Intent to Proceed
            </label>
            <label
              className="flex items-center body-100"
              style={{
                gap: "var(--roads-spacing-component-xs)",
                color: isEditing ? "var(--roads-text-primary)" : "var(--roads-text-secondary)",
                cursor: isEditing ? "pointer" : "default",
              }}
              data-testid="checkbox-brp-loan"
            >
              <input
                type="checkbox"
                checked={fields.brpLoan}
                onChange={(e) => setField("brpLoan")(e.target.checked)}
                disabled={!isEditing}
                style={{
                  width: "var(--roads-spacing-component-l)",
                  height: "var(--roads-spacing-component-l)",
                  border: isEditing ? "1px solid var(--roads-border-dark)" : "1px solid var(--roads-border-subtle)",
                  borderRadius: "var(--roads-radius-2xs)",
                  accentColor: "var(--roads-bg-action)",
                  cursor: isEditing ? "pointer" : "default",
                  flexShrink: 0,
                }}
              />
              BRP Loan
            </label>
          </div>
        </div>

        {/* Tell the Story + Edit button: 24px between them */}
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
          <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xs)" }}>
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              Tell the Story
            </span>
            <textarea
              value={fields.tellTheStory}
              onChange={(e) => setField("tellTheStory")(e.target.value)}
              placeholder="Tell the story about the borrower."
              rows={5}
              disabled={!isEditing}
              className="w-full outline-none body-100 roads-textarea-placeholder"
              style={{
                backgroundColor: isEditing ? "var(--roads-bg-primary)" : "var(--roads-bg-light)",
                border: isEditing ? "1px solid var(--roads-border-dark)" : "1px solid var(--roads-border-subtle)",
                borderRadius: "var(--roads-radius-2xs)",
                padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
                color: "var(--roads-text-primary)",
                resize: isEditing ? "vertical" : "none",
                fontFamily: "var(--roads-font-family)",
                cursor: isEditing ? "auto" : "default",
              }}
              data-testid="textarea-tell-the-story"
            />
          </div>

          <div className="flex items-center justify-end">
            {isEditing ? (
              <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
                <button
                  onClick={handleDiscard}
                  className="body-200-strong"
                  style={{
                    backgroundColor: "var(--roads-bg-error)",
                    border: "1px solid var(--roads-bg-error)",
                    borderRadius: "var(--roads-radius-2xs)",
                    padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                    color: "var(--roads-text-reverse)",
                    cursor: "pointer",
                  }}
                  data-testid="button-discard-loan-details"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSave}
                  className="body-200-strong"
                  style={{
                    backgroundColor: "var(--roads-bg-action)",
                    color: "var(--roads-text-reverse)",
                    border: "1px solid var(--roads-bg-action)",
                    borderRadius: "var(--roads-radius-2xs)",
                    padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                    cursor: "pointer",
                  }}
                  data-testid="button-save-loan-details"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditToggle}
                className="body-200-strong flex items-center"
                style={{
                  backgroundColor: "var(--roads-bg-primary)",
                  border: "1px solid var(--roads-border-dark)",
                  borderRadius: "var(--roads-radius-2xs)",
                  padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                  color: "var(--roads-text-primary)",
                  gap: "var(--roads-spacing-component-2xs)",
                  cursor: "pointer",
                }}
                data-testid="button-edit-loan-details"
              >
                <Pencil
                  style={{
                    width: "var(--roads-spacing-component-m)",
                    height: "var(--roads-spacing-component-m)",
                  }}
                />
                Edit
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
