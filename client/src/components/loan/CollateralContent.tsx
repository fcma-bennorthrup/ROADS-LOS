import { useState } from "react";
import { Calendar, Pencil } from "lucide-react";

function CollateralField({
  label,
  value,
  hasLeadingIcon,
  hasTrailingIcon,
  width,
  isEditing,
  onChange,
}: {
  label: string;
  value: string;
  hasLeadingIcon?: boolean;
  hasTrailingIcon?: boolean;
  width?: string;
  isEditing: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ width: width || "288px", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`field-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span
        className="label-strong"
        style={{ color: "var(--roads-text-primary)", lineHeight: "16px" }}
      >
        {label}
      </span>
      <div
        className="flex items-start w-full"
        style={{
          backgroundColor: isEditing ? "var(--roads-bg-primary)" : "var(--roads-bg-light)",
          border: isEditing
            ? "1px solid var(--roads-border-dark)"
            : "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-2xs)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          gap: "var(--roads-spacing-component-xs)",
        }}
      >
        {hasLeadingIcon && (
          <span
            style={{
              color: "var(--roads-text-secondary)",
              fontSize: "16px",
              lineHeight: "20px",
              fontWeight: 600,
              fontFamily: "var(--roads-font-family)",
            }}
          >
            $
          </span>
        )}
        {isEditing ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full outline-none"
            style={{
              flex: 1,
              fontFamily: "var(--roads-font-family)",
              fontSize: "16px",
              fontWeight: 600,
              lineHeight: "20px",
              color: "var(--roads-text-primary)",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            data-testid={`input-${label.toLowerCase().replace(/\s+/g, "-")}`}
          />
        ) : (
          <span
            style={{
              flex: 1,
              fontFamily: "var(--roads-font-family)",
              fontSize: "16px",
              fontWeight: 600,
              lineHeight: "20px",
              color: "var(--roads-text-primary)",
            }}
          >
            {value}
          </span>
        )}
        {hasTrailingIcon && (
          <Calendar
            className="shrink-0"
            style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }}
          />
        )}
      </div>
    </div>
  );
}

function StateZipFields({
  stateVal,
  zipVal,
  isEditing,
  onStateChange,
  onZipChange,
}: {
  stateVal: string;
  zipVal: string;
  isEditing: boolean;
  onStateChange: (v: string) => void;
  onZipChange: (v: string) => void;
}) {
  return (
    <div
      className="flex"
      style={{ width: "288px", gap: "var(--roads-spacing-component-l)" }}
      data-testid="field-state-zip"
    >
      <CollateralField label="State" value={stateVal} width="136px" isEditing={isEditing} onChange={onStateChange} />
      <CollateralField label="Zip" value={zipVal} width="136px" isEditing={isEditing} onChange={onZipChange} />
    </div>
  );
}

function EditControls({
  isEditing,
  onEdit,
  onSave,
  onDiscard,
  testIdPrefix,
}: {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
  testIdPrefix: string;
}) {
  return (
    <div
      className="flex items-center justify-end"
      style={{ padding: "0 var(--roads-spacing-component-3xl)" }}
    >
      {!isEditing ? (
        <button
          onClick={onEdit}
          className="body-200-strong flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-primary)",
            border: "1px solid var(--roads-border-dark)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
            color: "var(--roads-text-primary)",
            gap: "var(--roads-spacing-component-2xs)",
          }}
          data-testid={`${testIdPrefix}-button-edit`}
        >
          <Pencil style={{ width: 12, height: 12 }} />
          Edit
        </button>
      ) : (
        <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <button
            onClick={onDiscard}
            className="body-200-strong"
            style={{
              backgroundColor: "var(--roads-bg-error)",
              border: "1px solid var(--roads-bg-error)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
              color: "var(--roads-text-reverse)",
            }}
            data-testid={`${testIdPrefix}-button-discard`}
          >
            Discard Changes
          </button>
          <button
            onClick={onSave}
            className="body-200-strong"
            style={{
              backgroundColor: "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              border: "1px solid var(--roads-bg-action)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
            }}
            data-testid={`${testIdPrefix}-button-save`}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

const DEFAULT_ADDRESS = {
  address1: "Address",
  address2: "Address 2",
  city: "Louisville",
  county: "Louisville",
  state: "KY",
  zip: "40234",
};

const DEFAULT_EVALUATION = {
  estimatedValue: "400,000",
  evaluationDate: "01/22/2022",
  appraisalType: "As is",
  landValue: "100,000",
  otherImprovementsValue: "50,000",
  reportedValueTotal: "450,000",
  appraiser: "Jerry Geraldson",
};

export function CollateralContent() {
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressFields, setAddressFields] = useState({ ...DEFAULT_ADDRESS });
  const [savedAddressFields, setSavedAddressFields] = useState({ ...DEFAULT_ADDRESS });

  const [isEditingValue, setIsEditingValue] = useState(false);
  const [valueFields, setValueFields] = useState({ ...DEFAULT_EVALUATION });
  const [savedValueFields, setSavedValueFields] = useState({ ...DEFAULT_EVALUATION });

  const updateAddressField = (key: keyof typeof addressFields) => (value: string) => {
    setAddressFields((prev) => ({ ...prev, [key]: value }));
  };

  const updateValueField = (key: keyof typeof valueFields) => (value: string) => {
    setValueFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) 0",
        paddingBottom: "60px",
        gap: "var(--roads-spacing-component-l)",
      }}
      data-testid="collateral-content"
    >
      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-l)" }}
      >
        <h2
          className="headline-300"
          style={{
            color: "var(--roads-text-primary)",
            padding: "0 var(--roads-spacing-component-3xl)",
          }}
          data-testid="section-subject-property"
        >
          Subject Property
        </h2>
        <div
          className="flex flex-wrap items-center"
          style={{
            padding: "0 var(--roads-spacing-component-3xl)",
            gap: "var(--roads-spacing-component-3xl)",
          }}
        >
          <CollateralField label="Address 1" value={addressFields.address1} isEditing={isEditingAddress} onChange={updateAddressField("address1")} />
          <CollateralField label="Address 2" value={addressFields.address2} isEditing={isEditingAddress} onChange={updateAddressField("address2")} />
          <CollateralField label="City" value={addressFields.city} isEditing={isEditingAddress} onChange={updateAddressField("city")} />
          <CollateralField label="County" value={addressFields.county} isEditing={isEditingAddress} onChange={updateAddressField("county")} />
          <StateZipFields
            stateVal={addressFields.state}
            zipVal={addressFields.zip}
            isEditing={isEditingAddress}
            onStateChange={updateAddressField("state")}
            onZipChange={updateAddressField("zip")}
          />
        </div>
        <EditControls
          isEditing={isEditingAddress}
          onEdit={() => { setSavedAddressFields({ ...addressFields }); setIsEditingAddress(true); }}
          onSave={() => { setSavedAddressFields({ ...addressFields }); setIsEditingAddress(false); }}
          onDiscard={() => { setAddressFields({ ...savedAddressFields }); setIsEditingAddress(false); }}
          testIdPrefix="address"
        />
      </div>

      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-l)" }}
      >
        <div
          className="flex flex-col"
          style={{
            padding: "0 var(--roads-spacing-component-3xl)",
            gap: "var(--roads-spacing-component-xs)",
          }}
        >
          <h2
            className="headline-300"
            style={{ color: "var(--roads-text-primary)" }}
            data-testid="section-value"
          >
            Value
          </h2>
          <div
            className="flex items-start"
            style={{ gap: "var(--roads-spacing-component-l)" }}
          >
            <button
              className="body-200-strong"
              style={{
                backgroundColor: "var(--roads-bg-action)",
                color: "var(--roads-text-reverse)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                borderRadius: "var(--roads-radius-2xs)",
              }}
              data-testid="button-split-appraisal"
            >
              Split Appraisal
            </button>
            <button
              className="body-200-strong"
              style={{
                backgroundColor: "var(--roads-bg-error)",
                color: "var(--roads-text-reverse)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                borderRadius: "var(--roads-radius-2xs)",
              }}
              data-testid="button-delete-evaluation"
            >
              Delete Evaluation 2
            </button>
          </div>
        </div>
        <div
          className="flex flex-wrap items-center"
          style={{
            padding: "0 var(--roads-spacing-component-3xl)",
            gap: "var(--roads-spacing-component-3xl)",
          }}
        >
          <CollateralField label="Estimated Value" value={valueFields.estimatedValue} hasLeadingIcon isEditing={isEditingValue} onChange={updateValueField("estimatedValue")} />
          <CollateralField label="Evaluation Date" value={valueFields.evaluationDate} hasTrailingIcon isEditing={isEditingValue} onChange={updateValueField("evaluationDate")} />
          <CollateralField label="Appraisal Type" value={valueFields.appraisalType} isEditing={isEditingValue} onChange={updateValueField("appraisalType")} />
          <CollateralField label="Land Value" value={valueFields.landValue} hasLeadingIcon isEditing={isEditingValue} onChange={updateValueField("landValue")} />
          <CollateralField label="Other Improvements Value" value={valueFields.otherImprovementsValue} hasLeadingIcon isEditing={isEditingValue} onChange={updateValueField("otherImprovementsValue")} />
          <CollateralField label="Reported Value Total" value={valueFields.reportedValueTotal} hasLeadingIcon isEditing={isEditingValue} onChange={updateValueField("reportedValueTotal")} />
          <CollateralField label="Appraiser" value={valueFields.appraiser} isEditing={isEditingValue} onChange={updateValueField("appraiser")} />
        </div>
        <EditControls
          isEditing={isEditingValue}
          onEdit={() => { setSavedValueFields({ ...valueFields }); setIsEditingValue(true); }}
          onSave={() => { setSavedValueFields({ ...valueFields }); setIsEditingValue(false); }}
          onDiscard={() => { setValueFields({ ...savedValueFields }); setIsEditingValue(false); }}
          testIdPrefix="value"
        />
      </div>
    </div>
  );
}
