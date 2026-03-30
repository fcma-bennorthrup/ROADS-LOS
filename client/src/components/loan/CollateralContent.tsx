import { useState } from "react";
import { Calendar, Pencil } from "lucide-react";

interface FieldData {
  label: string;
  value: string;
  hasLeadingIcon?: boolean;
  hasTrailingIcon?: boolean;
  width?: string;
}

function CollateralField({
  label,
  value,
  hasLeadingIcon,
  hasTrailingIcon,
  width,
  isEditing,
  onChange,
}: FieldData & {
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
            ? "1px solid var(--roads-border-brand)"
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

const DEFAULT_ADDRESS = {
  address1: "Address",
  address2: "Address 2",
  city: "Louisville",
  county: "Louisville",
  state: "KY",
  zip: "40234",
};

export function CollateralContent() {
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState({ ...DEFAULT_ADDRESS });
  const [savedFields, setSavedFields] = useState({ ...DEFAULT_ADDRESS });

  const updateField = (key: keyof typeof fields) => (value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = () => {
    setSavedFields({ ...fields });
    setIsEditing(true);
  };

  const handleSave = () => {
    setSavedFields({ ...fields });
    setIsEditing(false);
  };

  const handleDiscard = () => {
    setFields({ ...savedFields });
    setIsEditing(false);
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
          <CollateralField label="Address 1" value={fields.address1} isEditing={isEditing} onChange={updateField("address1")} />
          <CollateralField label="Address 2" value={fields.address2} isEditing={isEditing} onChange={updateField("address2")} />
          <CollateralField label="City" value={fields.city} isEditing={isEditing} onChange={updateField("city")} />
          <CollateralField label="County" value={fields.county} isEditing={isEditing} onChange={updateField("county")} />
          <StateZipFields
            stateVal={fields.state}
            zipVal={fields.zip}
            isEditing={isEditing}
            onStateChange={updateField("state")}
            onZipChange={updateField("zip")}
          />
        </div>
        <div
          className="flex items-center justify-end"
          style={{ padding: "0 var(--roads-spacing-component-3xl)" }}
        >
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="body-200-strong flex items-center"
              style={{
                backgroundColor: "var(--roads-bg-primary)",
                border: "1px solid var(--roads-border-dark)",
                borderRadius: "var(--roads-radius-2xs)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                color: "var(--roads-text-primary)",
                gap: "var(--roads-spacing-component-2xs)",
              }}
              data-testid="button-edit"
            >
              <Pencil style={{ width: 12, height: 12 }} />
              Edit
            </button>
          ) : (
            <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
              <button
                onClick={handleDiscard}
                className="body-200-strong"
                style={{
                  backgroundColor: "var(--roads-bg-primary)",
                  border: "1px solid var(--roads-border-dark)",
                  borderRadius: "var(--roads-radius-2xs)",
                  padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                  color: "var(--roads-text-primary)",
                }}
                data-testid="button-discard"
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
                }}
                data-testid="button-save"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-xs)" }}
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
              data-testid="button-primary"
            >
              Primary
            </button>
            <button
              className="body-200-strong"
              style={{
                backgroundColor: "var(--roads-bg-error-disabled)",
                color: "var(--roads-text-reverse)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                borderRadius: "var(--roads-radius-2xs)",
              }}
              data-testid="button-destructive"
            >
              Destructive
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
          <CollateralField label="Estimated Value" value="400,000" hasLeadingIcon isEditing={false} />
          <CollateralField label="Evaluation Date" value="01/22/2022" hasTrailingIcon isEditing={false} />
          <CollateralField label="Appraisal Type" value="As is" isEditing={false} />
          <CollateralField label="Land Value" value="100,000" hasLeadingIcon isEditing={false} />
        </div>
      </div>
    </div>
  );
}
