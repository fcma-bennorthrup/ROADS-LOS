import { useState, useRef } from "react";
import { Pencil, Calendar, ChevronDown } from "lucide-react";
import { RoadsDropdown } from "./RoadsDropdown";

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

function DisabledRadio({
  groupName,
  optionValue,
  selectedValue,
  label,
  testId,
}: {
  groupName: string;
  optionValue: string;
  selectedValue: string;
  label: string;
  testId: string;
}) {
  const checked = optionValue === selectedValue;
  return (
    <label
      className="flex items-center body-100"
      style={{
        gap: "var(--roads-spacing-component-xs)",
        color: "var(--roads-text-primary)",
        cursor: "default",
      }}
      data-testid={`radio-${testId}`}
    >
      <input
        type="radio"
        name={groupName}
        checked={checked}
        readOnly
        disabled
        style={{
          width: "16px",
          height: "16px",
          accentColor: "var(--roads-bg-action)",
          flexShrink: 0,
          cursor: "default",
        }}
      />
      {label}
    </label>
  );
}

function YesNoQuestion({
  question,
  groupName,
  selected,
  testId,
}: {
  question: string;
  groupName: string;
  selected: "yes" | "no";
  testId: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        gap: "var(--roads-spacing-component-l)",
        padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
      }}
      data-testid={`question-${testId}`}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {question}
      </span>
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <DisabledRadio
          groupName={groupName}
          optionValue="yes"
          selectedValue={selected}
          label="Yes"
          testId={`${testId}-yes`}
        />
        <DisabledRadio
          groupName={groupName}
          optionValue="no"
          selectedValue={selected}
          label="No"
          testId={`${testId}-no`}
        />
      </div>
    </div>
  );
}

function DisabledCheckbox({
  label,
  checked,
  testId,
}: {
  label: string;
  checked: boolean;
  testId: string;
}) {
  return (
    <label
      className="flex items-center body-100"
      style={{
        gap: "var(--roads-spacing-component-xs)",
        color: "var(--roads-text-primary)",
        cursor: "default",
      }}
      data-testid={`checkbox-${testId}`}
    >
      <input
        type="checkbox"
        checked={checked}
        readOnly
        disabled
        style={{
          width: "16px",
          height: "16px",
          accentColor: "var(--roads-bg-action)",
          flexShrink: 0,
          cursor: "default",
        }}
      />
      {label}
    </label>
  );
}

function MoneyDisplayField({ value, label, testId }: { value: string; label: string; testId: string }) {
  return (
    <div
      className="flex flex-col"
      style={{
        gap: "var(--roads-spacing-component-l)",
        padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
      }}
      data-testid={`field-${testId}`}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {label}
      </span>
      <div
        className="flex items-center"
        style={{
          maxWidth: "320px",
          backgroundColor: "var(--roads-bg-light)",
          border: "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-2xs)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          gap: "var(--roads-spacing-component-xs)",
          height: "44px",
        }}
      >
        <span className="label-strong" style={{ color: "var(--roads-text-secondary)" }}>$</span>
        <span className="label-strong" style={{ flex: 1, color: "var(--roads-text-primary)" }}>
          {value || "\u00A0"}
        </span>
      </div>
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

const DECLARATION_QUESTIONS: { question: string; testId: string; selected: "yes" | "no" }[] = [
  { question: "Will you occupy the property as your primary residence?", testId: "occupy-primary", selected: "yes" },
  { question: "Have you had ownership interest in another property in the last three years?", testId: "ownership-interest", selected: "no" },
  { question: "Do you have family relationship or business affiliation with the seller of the property?", testId: "seller-affiliation", selected: "no" },
  { question: "Are you borrowing any money for this real estate transaction or obtaining any money from another party, such as the seller or realtor, that you have not disclosed on this loan application?", testId: "borrowing-undisclosed", selected: "no" },
  { question: "Have you or will you be applying for a mortgage loan on another property (not the property securing this loan) on or before closing this transaction that is not disclosed on this loan application?", testId: "other-mortgage", selected: "no" },
  { question: "Have you or will you be applying for any new credit on or before closing this loan that is not disclosed on this application?", testId: "new-credit", selected: "no" },
  { question: "Are you a co-signer or guarantor on any debt or loan that is not disclosed on this application?", testId: "co-signer", selected: "no" },
  { question: "Are there any outstanding judgments against you?", testId: "judgments", selected: "no" },
  { question: "Are you currently delinquent or in default on a Federal debt?", testId: "federal-debt", selected: "no" },
  { question: "Are you a party to a lawsuit in which you potentially have any personal financial liability?", testId: "lawsuit", selected: "no" },
  { question: "Have you conveyed title to any property in lieu of foreclosure in the past 7 years?", testId: "conveyed-title", selected: "no" },
  { question: "Within the past 7 years have you completed a pre-foreclosure sale or short sale, whereby the property was sold to a third party and the Lender agreed to accept less than the outstanding mortgage balance due?", testId: "short-sale", selected: "no" },
  { question: "Have you had property foreclose upon in the last 7 years?", testId: "foreclosed", selected: "no" },
  { question: "Have you declared bankruptcy within the past 7 years?", testId: "bankruptcy", selected: "no" },
];

function DeclarationsSection() {
  const yn = (q: typeof DECLARATION_QUESTIONS[number], idx: number) => (
    <YesNoQuestion
      key={q.testId}
      question={q.question}
      groupName={`decl-${idx}`}
      selected={q.selected}
      testId={q.testId}
    />
  );

  const moneyField = (
    <MoneyDisplayField
      key="amount-of-money"
      label="If yes, what is the amount of this money?"
      value="0.00"
      testId="amount-of-money"
    />
  );

  const bankruptcyTypes = (
    <div
      key="bankruptcy-types"
      className="flex flex-col"
      style={{
        gap: "var(--roads-spacing-component-l)",
        padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
      }}
      data-testid="question-bankruptcy-types"
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        If yes, identify the type(s) of bankruptcy:
      </span>
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <DisabledCheckbox label="Chapter 7" checked={false} testId="chapter-7" />
        <DisabledCheckbox label="Chapter 11" checked={false} testId="chapter-11" />
        <DisabledCheckbox label="Chapter 12" checked={false} testId="chapter-12" />
        <DisabledCheckbox label="Chapter 13" checked={false} testId="chapter-13" />
      </div>
    </div>
  );

  // 2 columns x 8 rows, row-major order matching Figma:
  // Row 1: Q1 (occupy)            | Q2 (ownership)
  // Row 2: Q3 (seller affiliation)| Q4 (borrowing money)
  // Row 3: Money field            | Q5 (other mortgage)
  // Row 4: Q6 (new credit)        | Q7 (co-signer)
  // Row 5: Q8 (judgments)         | Q9 (federal debt)
  // Row 6: Q10 (lawsuit)          | Q11 (conveyed title)
  // Row 7: Q12 (short sale)       | Q13 (foreclosed)
  // Row 8: Q14 (bankruptcy)       | bankruptcy types
  const cells: React.ReactNode[] = [
    yn(DECLARATION_QUESTIONS[0], 0),
    yn(DECLARATION_QUESTIONS[1], 1),
    yn(DECLARATION_QUESTIONS[2], 2),
    yn(DECLARATION_QUESTIONS[3], 3),
    moneyField,
    yn(DECLARATION_QUESTIONS[4], 4),
    yn(DECLARATION_QUESTIONS[5], 5),
    yn(DECLARATION_QUESTIONS[6], 6),
    yn(DECLARATION_QUESTIONS[7], 7),
    yn(DECLARATION_QUESTIONS[8], 8),
    yn(DECLARATION_QUESTIONS[9], 9),
    yn(DECLARATION_QUESTIONS[10], 10),
    yn(DECLARATION_QUESTIONS[11], 11),
    yn(DECLARATION_QUESTIONS[12], 12),
    yn(DECLARATION_QUESTIONS[13], 13),
    bankruptcyTypes,
  ];

  return (
    <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
      <h3
        className="headline-300"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="section-declarations"
      >
        Declarations
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridAutoRows: "min-content",
          alignItems: "start",
          columnGap: "var(--roads-spacing-component-xl)",
          rowGap: "var(--roads-spacing-component-xl)",
        }}
      >
        {cells}
      </div>
    </div>
  );
}

function MilitarySection() {
  return (
    <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
      <h3
        className="headline-300"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="section-military"
      >
        Military Service
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: "var(--roads-spacing-component-xl)",
          rowGap: "var(--roads-spacing-component-2xl)",
        }}
      >
        <YesNoQuestion
          question="Did you (or your deceased spouse) ever serve, or are you currently serving in the United States Armed Forces?"
          groupName="military-served"
          selected="no"
          testId="military-served"
        />
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-2xl)" }}>
          <div
            className="flex flex-col"
            style={{
              gap: "var(--roads-spacing-component-l)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
            }}
          >
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              If yes, check all that apply:
            </span>
            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
              <DisabledCheckbox
                label="Currently serving on active duty with projected expiration date of service/tour"
                checked={false}
                testId="active-duty"
              />
              <DisabledCheckbox
                label="Currently retired, discharged, or separated from service"
                checked={false}
                testId="retired-discharged"
              />
              <DisabledCheckbox
                label="Only period of service was as a non-activated member of the Reserve or National Guard"
                checked={false}
                testId="reserve-guard"
              />
              <DisabledCheckbox label="Surviving spouse" checked={false} testId="surviving-spouse" />
            </div>
          </div>
          <div
            className="flex flex-col"
            style={{
              gap: "var(--roads-spacing-component-l)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
            }}
            data-testid="field-projected-expiration"
          >
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              Projected Expiration of Service/Tour
            </span>
            <div
              className="flex items-center"
              style={{
                maxWidth: "320px",
                backgroundColor: "var(--roads-bg-light)",
                border: "1px solid var(--roads-border-subtle)",
                borderRadius: "var(--roads-radius-2xs)",
                padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
                gap: "var(--roads-spacing-component-xs)",
                height: "44px",
              }}
            >
              <span className="label-strong" style={{ flex: 1, color: "var(--roads-text-primary)" }}>
                {"\u00A0"}
              </span>
              <Calendar style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemographicSection() {
  return (
    <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
      <h3
        className="headline-300"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="section-demographic"
      >
        Demographic Information
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: "var(--roads-spacing-component-xl)",
          rowGap: "var(--roads-spacing-component-2xl)",
        }}
      >
        {/* Left column: Ethnicity, Other hispanic text, Sex */}
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-2xl)" }}>
          <div
            className="flex flex-col"
            style={{
              gap: "var(--roads-spacing-component-l)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
            }}
            data-testid="question-ethnicity"
          >
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              Ethnicity (check one or more):
            </span>
            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
              <DisabledCheckbox label="Hispanic or Latino" checked={false} testId="eth-hispanic" />
              <div
                className="flex flex-col"
                style={{ gap: "var(--roads-spacing-component-l)", paddingLeft: "var(--roads-spacing-component-xl)" }}
              >
                <DisabledCheckbox label="Mexican" checked={false} testId="eth-mexican" />
                <DisabledCheckbox label="Puerto Rican" checked={false} testId="eth-puerto-rican" />
                <DisabledCheckbox label="Cuban" checked={false} testId="eth-cuban" />
                <DisabledCheckbox label="Other Hispanic or Latino" checked={false} testId="eth-other-hispanic" />
              </div>
              <DisabledCheckbox
                label="I do not wish to provide this information"
                checked={true}
                testId="eth-no-provide"
              />
            </div>
          </div>

          <MoneyDisplayField
            label="Other Hispanic or Latino"
            value=""
            testId="eth-other-text"
          />

          <div
            className="flex flex-col"
            style={{
              gap: "var(--roads-spacing-component-l)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
            }}
            data-testid="question-sex"
          >
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              Sex:
            </span>
            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
              <DisabledCheckbox label="Female" checked={false} testId="sex-female" />
              <DisabledCheckbox label="Male" checked={true} testId="sex-male" />
              <DisabledCheckbox
                label="I do not wish to provide this information"
                checked={false}
                testId="sex-no-provide"
              />
            </div>
          </div>
        </div>

        {/* Right column: Race */}
        <div
          className="flex flex-col"
          style={{
            gap: "var(--roads-spacing-component-l)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
          }}
          data-testid="question-race"
        >
          <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
            Race (check one or more):
          </span>
          <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
            <DisabledCheckbox
              label="American Indian or Alaska Native"
              checked={false}
              testId="race-american-indian"
            />
            <DisabledCheckbox label="Asian" checked={false} testId="race-asian" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: "var(--roads-spacing-component-l)",
                rowGap: "var(--roads-spacing-component-l)",
                paddingLeft: "var(--roads-spacing-component-xl)",
              }}
            >
              <DisabledCheckbox label="Asian Indian" checked={false} testId="race-asian-indian" />
              <DisabledCheckbox label="Filipino" checked={false} testId="race-filipino" />
              <DisabledCheckbox label="Korean" checked={false} testId="race-korean" />
              <DisabledCheckbox label="Other Asian" checked={false} testId="race-other-asian" />
              <DisabledCheckbox label="Chinese" checked={false} testId="race-chinese" />
              <DisabledCheckbox label="Japanese" checked={false} testId="race-japanese" />
              <DisabledCheckbox label="Vietnamese" checked={false} testId="race-vietnamese" />
            </div>
            <DisabledCheckbox
              label="Black or African American"
              checked={false}
              testId="race-black"
            />
            <DisabledCheckbox
              label="Native Hawaiian or Other Pacific Islander"
              checked={false}
              testId="race-native-hawaiian-pi"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: "var(--roads-spacing-component-l)",
                rowGap: "var(--roads-spacing-component-l)",
                paddingLeft: "var(--roads-spacing-component-xl)",
              }}
            >
              <DisabledCheckbox label="Native Hawaiian" checked={false} testId="race-hawaiian" />
              <DisabledCheckbox
                label="Guamanian or Chamorro"
                checked={false}
                testId="race-guamanian"
              />
              <DisabledCheckbox label="Samoan" checked={false} testId="race-samoan" />
              <DisabledCheckbox
                label="Other Pacific Islander"
                checked={false}
                testId="race-other-pi"
              />
            </div>
            <DisabledCheckbox label="White" checked={true} testId="race-white" />
            <DisabledCheckbox
              label="I do not wish to provide this information"
              checked={false}
              testId="race-no-provide"
            />
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--roads-border-subtle)", margin: "var(--roads-spacing-component-l) 0" }} />

      <div
        className="flex flex-col"
        style={{
          gap: "var(--roads-spacing-component-l)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
        }}
        data-testid="question-collection-method"
      >
        <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
          The demographic information was provided through:
        </span>
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <DisabledRadio
            groupName="demographic-method"
            optionValue="face-to-face"
            selectedValue="face-to-face"
            label="Face-to-face interview (includes electronic media w/ video component)"
            testId="method-face-to-face"
          />
          <DisabledRadio
            groupName="demographic-method"
            optionValue="telephone"
            selectedValue="face-to-face"
            label="Telephone interview"
            testId="method-telephone"
          />
          <DisabledRadio
            groupName="demographic-method"
            optionValue="fax-mail"
            selectedValue="face-to-face"
            label="Fax or mail"
            testId="method-fax-mail"
          />
          <DisabledRadio
            groupName="demographic-method"
            optionValue="email-internet"
            selectedValue="face-to-face"
            label="Email or internet"
            testId="method-email-internet"
          />
        </div>
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
