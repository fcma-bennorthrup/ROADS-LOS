import { useState, useRef } from "react";
import { Pencil, Calendar, ChevronDown } from "lucide-react";
import { RoadsDropdown } from "./RoadsDropdown";
import { DeclarationsSection } from "./borrower-presentation/DeclarationsSection";
import { MilitarySection } from "./borrower-presentation/MilitarySection";
import { DemographicSection } from "./borrower-presentation/DemographicSection";

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "separated", label: "Separated" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const FARM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "part_time", label: "Part Time Farmer" },
  { value: "full_time", label: "Full Time Farmer" },
];

const STATE_OPTIONS = [
  { value: "AL", label: "AL - Alabama" },
  { value: "AK", label: "AK - Alaska" },
  { value: "AZ", label: "AZ - Arizona" },
  { value: "AR", label: "AR - Arkansas" },
  { value: "CA", label: "CA - California" },
  { value: "CO", label: "CO - Colorado" },
  { value: "CT", label: "CT - Connecticut" },
  { value: "DE", label: "DE - Delaware" },
  { value: "FL", label: "FL - Florida" },
  { value: "GA", label: "GA - Georgia" },
  { value: "HI", label: "HI - Hawaii" },
  { value: "ID", label: "ID - Idaho" },
  { value: "IL", label: "IL - Illinois" },
  { value: "IN", label: "IN - Indiana" },
  { value: "IA", label: "IA - Iowa" },
  { value: "KS", label: "KS - Kansas" },
  { value: "KY", label: "KY - Kentucky" },
  { value: "LA", label: "LA - Louisiana" },
  { value: "ME", label: "ME - Maine" },
  { value: "MD", label: "MD - Maryland" },
  { value: "MA", label: "MA - Massachusetts" },
  { value: "MI", label: "MI - Michigan" },
  { value: "MN", label: "MN - Minnesota" },
  { value: "MS", label: "MS - Mississippi" },
  { value: "MO", label: "MO - Missouri" },
  { value: "MT", label: "MT - Montana" },
  { value: "NE", label: "NE - Nebraska" },
  { value: "NV", label: "NV - Nevada" },
  { value: "NH", label: "NH - New Hampshire" },
  { value: "NJ", label: "NJ - New Jersey" },
  { value: "NM", label: "NM - New Mexico" },
  { value: "NY", label: "NY - New York" },
  { value: "NC", label: "NC - North Carolina" },
  { value: "ND", label: "ND - North Dakota" },
  { value: "OH", label: "OH - Ohio" },
  { value: "OK", label: "OK - Oklahoma" },
  { value: "OR", label: "OR - Oregon" },
  { value: "PA", label: "PA - Pennsylvania" },
  { value: "RI", label: "RI - Rhode Island" },
  { value: "SC", label: "SC - South Carolina" },
  { value: "SD", label: "SD - South Dakota" },
  { value: "TN", label: "TN - Tennessee" },
  { value: "TX", label: "TX - Texas" },
  { value: "UT", label: "UT - Utah" },
  { value: "VT", label: "VT - Vermont" },
  { value: "VA", label: "VA - Virginia" },
  { value: "WA", label: "WA - Washington" },
  { value: "WV", label: "WV - West Virginia" },
  { value: "WI", label: "WI - Wisconsin" },
  { value: "WY", label: "WY - Wyoming" },
];

interface BorrowerInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  maritalStatus: string;
  dependents: string;
  dependentsAges: string;
  farmInvolvement: string;
}

const RICHARD_DATA: BorrowerInfo = {
  firstName: "Richard",
  lastName: "Jamerson",
  ssn: "XXX-XX-1234",
  dob: "1975-04-12",
  phone: "(502) 555-0142",
  email: "richard.jamerson@example.com",
  address: "123 Farm Lane",
  city: "Louisville",
  state: "KY",
  zip: "40234",
  maritalStatus: "married",
  dependents: "2",
  dependentsAges: "12, 9",
  farmInvolvement: "part_time",
};

const JANE_DATA: BorrowerInfo = {
  firstName: "Jane",
  lastName: "Jamerson",
  ssn: "XXX-XX-5678",
  dob: "1978-09-03",
  phone: "(502) 555-0188",
  email: "jane.jamerson@example.com",
  address: "123 Farm Lane",
  city: "Louisville",
  state: "KY",
  zip: "40234",
  maritalStatus: "married",
  dependents: "2",
  dependentsAges: "12, 9",
  farmInvolvement: "none",
};

const BORROWERS = [
  { id: "richard", name: "Richard Jamerson", isPrimary: true },
  { id: "jane", name: "Jane Jamerson", isPrimary: false },
];

function PrimaryChip() {
  return (
    <span
      className="body-200-strong flex items-center"
      style={{
        backgroundColor: "var(--roads-bg-brand-subtle)",
        color: "var(--roads-text-brand)",
        padding: "0 var(--roads-spacing-component-xs)",
        borderRadius: "var(--roads-radius-2xs)",
        height: "20px",
        whiteSpace: "nowrap",
      }}
      data-testid="chip-primary-borrower"
    >
      Primary Borrower
    </span>
  );
}

function BorrowerTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex" data-testid="borrower-tabs">
      {BORROWERS.map((b) => {
        const isActive = b.id === active;
        return (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            className="label-strong whitespace-nowrap"
            style={{
              padding: "0 var(--roads-spacing-component-xl)",
              height: "48px",
              display: "flex",
              alignItems: "center",
              color: isActive ? "var(--roads-text-brand)" : "var(--roads-text-primary)",
              background: "none",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--roads-border-brand)"
                : "1px solid var(--roads-border-subtle)",
              cursor: "pointer",
            }}
            data-testid={`tab-borrower-${b.id}`}
          >
            {b.name}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
      {children}
    </span>
  );
}

function ReadOnlyDisplay({ value, showChevron }: { value: string; showChevron?: boolean }) {
  return (
    <div
      className="flex items-center w-full"
      style={{
        backgroundColor: "var(--roads-bg-light)",
        border: "1px solid var(--roads-border-subtle)",
        borderRadius: "var(--roads-radius-2xs)",
        padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
        gap: "var(--roads-spacing-component-xs)",
        height: "44px",
      }}
    >
      <span
        className="label-strong"
        style={{
          flex: 1,
          minWidth: 0,
          color: "var(--roads-text-primary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value || "\u00A0"}
      </span>
      {showChevron && (
        <ChevronDown
          style={{ width: 16, height: 16, color: "var(--roads-text-tertiary)" }}
        />
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  isEditing,
  onChange,
  width,
  testId,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (v: string) => void;
  width?: string;
  testId: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ width: width || "288px", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`field-${testId}`}
    >
      <FieldLabel>{label}</FieldLabel>
      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full outline-none label-strong"
          style={{
            backgroundColor: "var(--roads-bg-primary)",
            border: "1px solid var(--roads-border-dark)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
            color: "var(--roads-text-primary)",
            height: "44px",
          }}
          data-testid={`input-${testId}`}
        />
      ) : (
        <ReadOnlyDisplay value={value} />
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  isEditing,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (v: string) => void;
  testId: string;
}) {
  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div
      className="flex flex-col"
      style={{ width: "288px", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`field-${testId}`}
    >
      <FieldLabel>{label}</FieldLabel>
      {isEditing ? (
        <div
          className="flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-primary)",
            border: "1px solid var(--roads-border-dark)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
            gap: "var(--roads-spacing-component-xs)",
            height: "44px",
          }}
        >
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="outline-none label-strong"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              padding: 0,
              color: "var(--roads-text-primary)",
              fontFamily: "var(--roads-font-family)",
            }}
            data-testid={`input-${testId}`}
          />
        </div>
      ) : (
        <div
          className="flex items-center w-full"
          style={{
            backgroundColor: "var(--roads-bg-light)",
            border: "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
            gap: "var(--roads-spacing-component-xs)",
            height: "44px",
          }}
        >
          <span className="label-strong" style={{ flex: 1, color: "var(--roads-text-primary)" }}>
            {displayValue || "\u00A0"}
          </span>
          <Calendar style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
        </div>
      )}
    </div>
  );
}

function DropdownField({
  label,
  value,
  options,
  isEditing,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  isEditing: boolean;
  onChange: (v: string) => void;
  testId: string;
}) {
  const displayValue = options.find((o) => o.value === value)?.label || "";
  return (
    <div
      className="flex flex-col"
      style={{ width: "288px", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`field-${testId}`}
    >
      <FieldLabel>{label}</FieldLabel>
      {isEditing ? (
        <RoadsDropdown
          value={value}
          onChange={onChange}
          options={options}
          testId={`select-${testId}`}
        />
      ) : (
        <ReadOnlyDisplay value={displayValue} showChevron />
      )}
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
  const stateLabel = STATE_OPTIONS.find((o) => o.value === stateVal)?.label || "";
  return (
    <div
      className="flex"
      style={{ width: "288px", gap: "var(--roads-spacing-component-l)" }}
      data-testid="field-state-zip"
    >
      <div
        className="flex flex-col"
        style={{ width: "136px", gap: "var(--roads-spacing-component-xs)" }}
      >
        <FieldLabel>State</FieldLabel>
        {isEditing ? (
          <RoadsDropdown
            value={stateVal}
            onChange={onStateChange}
            options={STATE_OPTIONS}
            testId="select-state"
          />
        ) : (
          <ReadOnlyDisplay value={stateLabel} showChevron />
        )}
      </div>
      <TextField
        label="Zip"
        value={zipVal}
        isEditing={isEditing}
        onChange={onZipChange}
        width="136px"
        testId="zip"
      />
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
    <div className="flex items-center justify-end">
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
            cursor: "pointer",
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
              cursor: "pointer",
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
              cursor: "pointer",
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

function PersonalInfoSection({
  borrowerName,
  isPrimary,
  data,
  isEditing,
  setField,
  onEdit,
  onSave,
  onDiscard,
}: {
  borrowerName: string;
  isPrimary: boolean;
  data: BorrowerInfo;
  isEditing: boolean;
  setField: <K extends keyof BorrowerInfo>(key: K) => (value: BorrowerInfo[K]) => void;
  onEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        gap: "var(--roads-spacing-component-2xl)",
        marginTop: "var(--roads-spacing-component-l)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <h3
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="text-borrower-name"
        >
          {borrowerName}
        </h3>
        {isPrimary && <PrimaryChip />}
      </div>

      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
        <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
          <TextField label="First Name" value={data.firstName} isEditing={isEditing} onChange={setField("firstName")} testId="first-name" />
          <TextField label="Last Name" value={data.lastName} isEditing={isEditing} onChange={setField("lastName")} testId="last-name" />
          <TextField label="SSN" value={data.ssn} isEditing={isEditing} onChange={setField("ssn")} testId="ssn" />
          <DateField label="DOB" value={data.dob} isEditing={isEditing} onChange={setField("dob")} testId="dob" />
          <TextField label="Phone" value={data.phone} isEditing={isEditing} onChange={setField("phone")} testId="phone" />
          <TextField label="Email Address" value={data.email} isEditing={isEditing} onChange={setField("email")} testId="email" />
        </div>

        <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
          <TextField label="Address" value={data.address} isEditing={isEditing} onChange={setField("address")} testId="address" />
          <TextField label="City" value={data.city} isEditing={isEditing} onChange={setField("city")} testId="city" />
          <StateZipFields
            stateVal={data.state}
            zipVal={data.zip}
            isEditing={isEditing}
            onStateChange={setField("state")}
            onZipChange={setField("zip")}
          />
        </div>

        <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
          <DropdownField
            label="Marital Status"
            value={data.maritalStatus}
            options={MARITAL_OPTIONS}
            isEditing={isEditing}
            onChange={setField("maritalStatus")}
            testId="marital-status"
          />
          <TextField label="Dependents" value={data.dependents} isEditing={isEditing} onChange={setField("dependents")} testId="dependents" />
          <TextField label="Dependent's Ages" value={data.dependentsAges} isEditing={isEditing} onChange={setField("dependentsAges")} testId="dependents-ages" />
          <DropdownField
            label="Farm Involvement"
            value={data.farmInvolvement}
            options={FARM_OPTIONS}
            isEditing={isEditing}
            onChange={setField("farmInvolvement")}
            testId="farm-involvement"
          />
        </div>
      </div>

      <div style={{ marginTop: "var(--roads-spacing-component-3xl)" }}>
        <EditControls
          isEditing={isEditing}
          onEdit={onEdit}
          onSave={onSave}
          onDiscard={onDiscard}
          testIdPrefix="borrower-info"
        />
      </div>
    </div>
  );
}

export function BorrowerInformationContent() {
  const [activeBorrower, setActiveBorrower] = useState<string>("richard");

  const [richardData, setRichardData] = useState<BorrowerInfo>({ ...RICHARD_DATA });
  const [janeData, setJaneData] = useState<BorrowerInfo>({ ...JANE_DATA });
  const richardSaved = useRef<BorrowerInfo>({ ...RICHARD_DATA });
  const janeSaved = useRef<BorrowerInfo>({ ...JANE_DATA });

  const [isEditingRichard, setIsEditingRichard] = useState(false);
  const [isEditingJane, setIsEditingJane] = useState(false);

  const isRichard = activeBorrower === "richard";
  const data = isRichard ? richardData : janeData;
  const setData = isRichard ? setRichardData : setJaneData;
  const saved = isRichard ? richardSaved : janeSaved;
  const isEditing = isRichard ? isEditingRichard : isEditingJane;
  const setIsEditing = isRichard ? setIsEditingRichard : setIsEditingJane;
  const borrower = BORROWERS.find((b) => b.id === activeBorrower)!;

  const setField = <K extends keyof BorrowerInfo>(key: K) => (value: BorrowerInfo[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = () => {
    saved.current = { ...data };
    setIsEditing(true);
  };

  const handleSave = () => {
    saved.current = { ...data };
    setIsEditing(false);
  };

  const handleDiscard = () => {
    setData({ ...saved.current });
    setIsEditing(false);
  };

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="borrower-information-content"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-borrower-information-title"
      >
        Borrower Information
      </h2>

      <BorrowerTabs active={activeBorrower} onChange={setActiveBorrower} />

      <PersonalInfoSection
        borrowerName={borrower.name}
        isPrimary={borrower.isPrimary}
        data={data}
        isEditing={isEditing}
        setField={setField}
        onEdit={handleEdit}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      <DeclarationsSection />

      <MilitarySection />

      <DemographicSection />
    </div>
  );
}
