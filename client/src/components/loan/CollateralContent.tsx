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
        className="flex items-center w-full"
        style={{
          backgroundColor: isEditing ? "var(--roads-bg-primary)" : "var(--roads-bg-light)",
          border: isEditing
            ? "1px solid var(--roads-border-dark)"
            : "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-2xs)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          gap: "var(--roads-spacing-component-xs)",
          minHeight: "20px",
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

interface EvaluationData {
  estimatedValue: string;
  evaluationDate: string;
  appraisalType: string;
  landValue: string;
  otherImprovementsValue: string;
  reportedValueTotal: string;
  appraiser: string;
}

function EvaluationFields({
  fields,
  isEditing,
  onFieldChange,
}: {
  fields: EvaluationData;
  isEditing: boolean;
  onFieldChange: (key: keyof EvaluationData) => (value: string) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center"
      style={{
        padding: "0 var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-3xl)",
      }}
    >
      <CollateralField label="Estimated Value" value={fields.estimatedValue} hasLeadingIcon isEditing={isEditing} onChange={onFieldChange("estimatedValue")} />
      <CollateralField label="Evaluation Date" value={fields.evaluationDate} hasTrailingIcon isEditing={isEditing} onChange={onFieldChange("evaluationDate")} />
      <CollateralField label="Appraisal Type" value={fields.appraisalType} isEditing={isEditing} onChange={onFieldChange("appraisalType")} />
      <CollateralField label="Land Value" value={fields.landValue} hasLeadingIcon isEditing={isEditing} onChange={onFieldChange("landValue")} />
      <CollateralField label="Other Improvements Value" value={fields.otherImprovementsValue} hasLeadingIcon isEditing={isEditing} onChange={onFieldChange("otherImprovementsValue")} />
      <CollateralField label="Reported Value Total" value={fields.reportedValueTotal} hasLeadingIcon isEditing={isEditing} onChange={onFieldChange("reportedValueTotal")} />
      <CollateralField label="Appraiser" value={fields.appraiser} isEditing={isEditing} onChange={onFieldChange("appraiser")} />
    </div>
  );
}

function EvaluationTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: number;
  onTabChange: (tab: number) => void;
}) {
  return (
    <div
      className="flex items-start"
      style={{ padding: "0 var(--roads-spacing-component-3xl)" }}
    >
      {[1, 2].map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="body-200-strong"
            style={{
              padding: "var(--roads-spacing-component-l) var(--roads-spacing-component-xl)",
              borderBottom: isActive
                ? "2px solid var(--roads-border-brand)"
                : "1px solid var(--roads-border-subtle)",
              color: isActive ? "var(--roads-text-brand)" : "var(--roads-text-primary)",
              background: "none",
              cursor: "pointer",
            }}
            data-testid={`tab-evaluation-${tab}`}
          >
            Evaluation {tab}
          </button>
        );
      })}
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

const DEFAULT_EVALUATION: EvaluationData = {
  estimatedValue: "400,000",
  evaluationDate: "01/22/2022",
  appraisalType: "As is",
  landValue: "100,000",
  otherImprovementsValue: "50,000",
  reportedValueTotal: "450,000",
  appraiser: "Jerry Geraldson",
};

const EMPTY_EVALUATION: EvaluationData = {
  estimatedValue: "",
  evaluationDate: "",
  appraisalType: "",
  landValue: "",
  otherImprovementsValue: "",
  reportedValueTotal: "",
  appraiser: "",
};

export function CollateralContent() {
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressFields, setAddressFields] = useState({ ...DEFAULT_ADDRESS });
  const [savedAddressFields, setSavedAddressFields] = useState({ ...DEFAULT_ADDRESS });

  const [isSplit, setIsSplit] = useState(false);
  const [activeEvalTab, setActiveEvalTab] = useState(1);

  const [isEditingValue, setIsEditingValue] = useState(false);
  const [eval1Fields, setEval1Fields] = useState<EvaluationData>({ ...DEFAULT_EVALUATION });
  const [savedEval1Fields, setSavedEval1Fields] = useState<EvaluationData>({ ...DEFAULT_EVALUATION });

  const [eval2Fields, setEval2Fields] = useState<EvaluationData>({ ...EMPTY_EVALUATION });
  const [savedEval2Fields, setSavedEval2Fields] = useState<EvaluationData>({ ...EMPTY_EVALUATION });

  const updateAddressField = (key: keyof typeof addressFields) => (value: string) => {
    setAddressFields((prev) => ({ ...prev, [key]: value }));
  };

  const activeEvalFields = activeEvalTab === 1 ? eval1Fields : eval2Fields;
  const setActiveEvalFields = activeEvalTab === 1 ? setEval1Fields : setEval2Fields;

  const updateEvalField = (key: keyof EvaluationData) => (value: string) => {
    setActiveEvalFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSplitAppraisal = () => {
    setIsSplit(true);
    setActiveEvalTab(1);
  };

  const handleDeleteEvaluation2 = () => {
    setIsSplit(false);
    setActiveEvalTab(1);
    setEval2Fields({ ...EMPTY_EVALUATION });
    setSavedEval2Fields({ ...EMPTY_EVALUATION });
    setIsEditingValue(false);
  };

  const handleValueEdit = () => {
    setSavedEval1Fields({ ...eval1Fields });
    setSavedEval2Fields({ ...eval2Fields });
    setIsEditingValue(true);
  };

  const handleValueSave = () => {
    setSavedEval1Fields({ ...eval1Fields });
    setSavedEval2Fields({ ...eval2Fields });
    setIsEditingValue(false);
  };

  const handleValueDiscard = () => {
    setEval1Fields({ ...savedEval1Fields });
    setEval2Fields({ ...savedEval2Fields });
    setIsEditingValue(false);
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
              onClick={handleSplitAppraisal}
              disabled={isSplit}
              className="body-200-strong"
              style={{
                backgroundColor: isSplit ? "var(--roads-bg-light)" : "var(--roads-bg-action)",
                color: isSplit ? "var(--roads-text-secondary)" : "var(--roads-text-reverse)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                borderRadius: "var(--roads-radius-2xs)",
                border: isSplit ? "1px solid var(--roads-border-subtle)" : "none",
                cursor: isSplit ? "not-allowed" : "pointer",
                opacity: isSplit ? 0.6 : 1,
              }}
              data-testid="button-split-appraisal"
            >
              Split Appraisal
            </button>
            <button
              onClick={handleDeleteEvaluation2}
              disabled={!isSplit}
              className="body-200-strong"
              style={{
                backgroundColor: !isSplit ? "var(--roads-bg-light)" : "var(--roads-bg-error)",
                color: !isSplit ? "var(--roads-text-secondary)" : "var(--roads-text-reverse)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                borderRadius: "var(--roads-radius-2xs)",
                border: !isSplit ? "1px solid var(--roads-border-subtle)" : "none",
                cursor: !isSplit ? "not-allowed" : "pointer",
                opacity: !isSplit ? 0.6 : 1,
              }}
              data-testid="button-delete-evaluation"
            >
              Delete Evaluation 2
            </button>
          </div>
        </div>

        {isSplit && (
          <EvaluationTabs
            activeTab={activeEvalTab}
            onTabChange={setActiveEvalTab}
          />
        )}

        <EvaluationFields
          fields={activeEvalFields}
          isEditing={isEditingValue}
          onFieldChange={updateEvalField}
        />

        <EditControls
          isEditing={isEditingValue}
          onEdit={handleValueEdit}
          onSave={handleValueSave}
          onDiscard={handleValueDiscard}
          testIdPrefix="value"
        />
      </div>
    </div>
  );
}
