import { useState, useRef } from "react";
import { Pencil } from "lucide-react";
import { RoadsDropdown } from "./RoadsDropdown";
import type { Borrower } from "@shared/schema";

const MARITAL_STATUS_OPTIONS = [
  { value: "married", label: "Married" },
  { value: "separated", label: "Separated" },
  { value: "unmarried", label: "Unmarried" },
];

const FARM_INVOLVEMENT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
];

interface BorrowerFields {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  homePhone: string;
  maritalStatus: string;
  dependents: string;
  farmInvolvement: string;
  declarations: Record<string, "yes" | "no" | "">;
}

const DECLARATION_QUESTIONS = [
  "Will you occupy the property as your primary residence?",
  "Have you had ownership interest in another property in the last three years?",
  "Do you have family relationship or business affiliation with the seller of the property?",
  "Are you borrowing any money for this real estate transaction or obtaining any money from another party, such as the seller or realtor, that you have not disclosed on this loan application?",
  "Have you or will you be applying for a mortgage loan on another property (not the property securing this loan) on or before closing this transaction that is not disclosed on this loan application?",
  "Have you or will you be applying for any new credit on or before closing this loan that is not disclosed on this application?",
  "Are you a co-signer or guarantor on any debt or loan that is not disclosed on this application?",
  "Are there any outstanding judgments against you?",
  "Are you currently delinquent or in default on a Federal debt?",
  "Are you a party to a lawsuit in which you potentially have any personal financial liability?",
  "Have you conveyed title to any property in lieu of foreclosure in the past 7 years?",
  "Within the past 7 years have you completed a pre-foreclosure sale or short sale, whereby the property was sold to a third party and the Lender agreed to accept less than the outstanding mortgage balance due?",
  "Have you had property foreclose upon in the last 7 years?",
  "Have you declared bankruptcy within the past 7 years?",
];

const SEED_FIELDS: Record<string, Partial<BorrowerFields>> = {
  Richard: {
    ssn: "***-**-1234",
    dateOfBirth: "01/15/1978",
    address: "106 Kentucky Drive",
    city: "Louisville",
    state: "KY",
    zip: "40234",
    homePhone: "(502) 555-0101",
    maritalStatus: "married",
    dependents: "2",
    farmInvolvement: "primary",
    declarations: { q0: "yes", q1: "no", q2: "no", q3: "no", q4: "no", q5: "no", q6: "no", q7: "no", q8: "no", q9: "no", q10: "no", q11: "no", q12: "no", q13: "no" },
  },
  Jamelle: {
    ssn: "***-**-5678",
    dateOfBirth: "03/22/1980",
    address: "106 Kentucky Drive",
    city: "Louisville",
    state: "KY",
    zip: "40234",
    homePhone: "(502) 555-0102",
    maritalStatus: "married",
    dependents: "2",
    farmInvolvement: "none",
    declarations: { q0: "yes", q1: "no", q2: "no", q3: "no", q4: "no", q5: "no", q6: "no", q7: "no", q8: "no", q9: "no", q10: "no", q11: "no", q12: "no", q13: "no" },
  },
  Priya: {
    ssn: "***-**-9012",
    dateOfBirth: "07/08/1990",
    address: "250 Maple Street",
    city: "Lexington",
    state: "KY",
    zip: "40502",
    homePhone: "(859) 555-0103",
    maritalStatus: "unmarried",
    dependents: "0",
    farmInvolvement: "none",
    declarations: { q0: "no", q1: "no", q2: "no", q3: "no", q4: "no", q5: "no", q6: "no", q7: "no", q8: "no", q9: "no", q10: "no", q11: "no", q12: "no", q13: "no" },
  },
};

function makeDefaultDeclarations(): Record<string, "yes" | "no" | ""> {
  return Object.fromEntries(DECLARATION_QUESTIONS.map((_, i) => [`q${i}`, ""]));
}

function borrowerToFields(borrower: Borrower): BorrowerFields {
  const nameParts = borrower.name.trim().split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const seed = SEED_FIELDS[firstName] ?? {};
  return {
    firstName,
    lastName,
    ssn: seed.ssn ?? "***-**-0000",
    dateOfBirth: seed.dateOfBirth ?? "",
    phone: borrower.phone,
    email: borrower.email,
    address: seed.address ?? "",
    city: seed.city ?? "",
    state: seed.state ?? "",
    zip: seed.zip ?? "",
    homePhone: seed.homePhone ?? "",
    maritalStatus: seed.maritalStatus ?? "unmarried",
    dependents: seed.dependents ?? "0",
    farmInvolvement: seed.farmInvolvement ?? "none",
    declarations: seed.declarations ?? makeDefaultDeclarations(),
  };
}

function BorrowerTextField({
  label,
  value,
  isEditing,
  onChange,
  testId,
  placeholder,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange?: (v: string) => void;
  testId?: string;
  placeholder?: string;
}) {
  const tid = testId ?? `field-${label.toLowerCase().replace(/[\s()]+/g, "-")}`;
  return (
    <div
      className="flex flex-col"
      style={{ flex: "1 1 0", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`borrower-field-${tid}`}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {label}
      </span>
      {isEditing ? (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className="outline-none label-strong"
          style={{
            width: "100%",
            backgroundColor: "var(--roads-bg-primary)",
            border: "1px solid var(--roads-border-dark)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
            color: "var(--roads-text-primary)",
            fontFamily: "var(--roads-font-family)",
          }}
          data-testid={`input-${tid}`}
        />
      ) : (
        <div
          className="flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-light)",
            border: "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          }}
        >
          <span className="label-strong" style={{ flex: 1, color: "var(--roads-text-primary)" }}>
            {value || "\u00A0"}
          </span>
        </div>
      )}
    </div>
  );
}

function BorrowerDropdownField({
  label,
  value,
  isEditing,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  options: { value: string; label: string }[];
  onChange?: (v: string) => void;
  testId?: string;
}) {
  const tid = testId ?? `field-${label.toLowerCase().replace(/[\s()]+/g, "-")}`;
  const displayLabel = options.find((o) => o.value === value)?.label ?? value;
  return (
    <div
      className="flex flex-col"
      style={{ flex: "1 1 0", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`borrower-field-${tid}`}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {label}
      </span>
      {isEditing ? (
        <RoadsDropdown
          value={value}
          onChange={(v) => onChange?.(v)}
          options={options}
          testId={`select-${tid}`}
        />
      ) : (
        <div
          className="flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-light)",
            border: "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          }}
        >
          <span className="label-strong" style={{ flex: 1, color: "var(--roads-text-primary)" }}>
            {displayLabel || "\u00A0"}
          </span>
        </div>
      )}
    </div>
  );
}

function RadioGroup({
  question,
  value,
  onChange,
  isEditing,
  questionIndex,
}: {
  question: string;
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no") => void;
  isEditing: boolean;
  questionIndex: number;
}) {
  const tid = `declaration-q${questionIndex}`;
  return (
    <div
      className="flex flex-col"
      style={{ gap: "var(--roads-spacing-component-l)" }}
      data-testid={tid}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {question}
      </span>
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        {(["yes", "no"] as const).map((opt) => {
          const checked = value === opt;
          return (
            <label
              key={opt}
              className="flex items-center body-100"
              style={{
                gap: "var(--roads-spacing-component-xs)",
                cursor: isEditing ? "pointer" : "default",
                color: checked ? "var(--roads-text-primary)" : "var(--roads-text-tertiary)",
              }}
              data-testid={`${tid}-${opt}`}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: checked
                    ? "1px solid var(--roads-border-brand)"
                    : "1px solid var(--roads-border-dark)",
                  backgroundColor: "var(--roads-bg-primary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isEditing ? "pointer" : "default",
                }}
                onClick={() => isEditing && onChange(opt)}
              >
                {checked && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "var(--roads-bg-action)",
                    }}
                  />
                )}
              </div>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </label>
          );
        })}
      </div>
    </div>
  );
}

interface BorrowerInformationContentProps {
  borrowers: Borrower[];
}

export function BorrowerInformationContent({ borrowers }: BorrowerInformationContentProps) {
  const sorted = [...borrowers].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const primaryBorrower = sorted.find((b) => b.isPrimary) ?? sorted[0];

  const [activeBorrowerId, setActiveBorrowerId] = useState<string>(primaryBorrower?.id ?? "");
  const [isEditing, setIsEditing] = useState(false);

  const defaultFieldsMap = Object.fromEntries(sorted.map((b) => [b.id, borrowerToFields(b)]));
  const [fieldsMap, setFieldsMap] = useState<Record<string, BorrowerFields>>(defaultFieldsMap);
  const savedFieldsMap = useRef<Record<string, BorrowerFields>>({ ...defaultFieldsMap });

  const activeBorrower = sorted.find((b) => b.id === activeBorrowerId) ?? sorted[0];
  const fields = fieldsMap[activeBorrowerId] ?? borrowerToFields(activeBorrower);

  const setField = <K extends keyof BorrowerFields>(key: K) => (value: BorrowerFields[K]) => {
    setFieldsMap((prev) => ({
      ...prev,
      [activeBorrowerId]: { ...prev[activeBorrowerId], [key]: value },
    }));
  };

  const setDeclaration = (key: string) => (value: "yes" | "no") => {
    setFieldsMap((prev) => ({
      ...prev,
      [activeBorrowerId]: {
        ...prev[activeBorrowerId],
        declarations: { ...prev[activeBorrowerId].declarations, [key]: value },
      },
    }));
  };

  const handleEditToggle = () => {
    savedFieldsMap.current = JSON.parse(JSON.stringify(fieldsMap));
    setIsEditing(true);
  };

  const handleSave = () => {
    savedFieldsMap.current = JSON.parse(JSON.stringify(fieldsMap));
    setIsEditing(false);
  };

  const handleDiscard = () => {
    setFieldsMap(JSON.parse(JSON.stringify(savedFieldsMap.current)));
    setIsEditing(false);
  };

  const handleTabChange = (id: string) => {
    if (isEditing) {
      setFieldsMap(JSON.parse(JSON.stringify(savedFieldsMap.current)));
      setIsEditing(false);
    }
    setActiveBorrowerId(id);
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

      {/* Borrower Tabs */}
      <div
        className="flex"
        style={{
          borderBottom: "1px solid var(--roads-border-subtle)",
          gap: "var(--roads-spacing-component-xs)",
        }}
        data-testid="borrower-tabs"
      >
        {sorted.map((b) => {
          const isActive = b.id === activeBorrowerId;
          return (
            <button
              key={b.id}
              onClick={() => handleTabChange(b.id)}
              className="flex items-center body-100"
              style={{
                gap: "var(--roads-spacing-component-xs)",
                padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-m)",
                background: "none",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--roads-border-brand)"
                  : "2px solid transparent",
                cursor: "pointer",
                color: isActive ? "var(--roads-text-brand)" : "var(--roads-text-secondary)",
                fontWeight: isActive ? 600 : 400,
                marginBottom: -1,
                fontFamily: "var(--roads-font-family)",
              }}
              data-testid={`borrower-tab-${b.name.split(" ")[0].toLowerCase()}`}
            >
              {b.name}
              {b.isPrimary && (
                <span
                  className="caption-100-strong"
                  style={{
                    backgroundColor: "var(--roads-bg-information-subtle)",
                    color: "var(--roads-text-information)",
                    borderRadius: "var(--roads-radius-round)",
                    padding: "2px var(--roads-spacing-component-xs)",
                  }}
                  data-testid="primary-borrower-chip"
                >
                  Primary Borrower
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Personal Information Section */}
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <h3
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="section-personal-information"
        >
          Personal Information
        </h3>

        {/* Row 1: First Name, Last Name, SSN, Date of Birth, Phone */}
        <div className="flex" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <BorrowerTextField label="First Name" value={fields.firstName} isEditing={isEditing} onChange={setField("firstName")} testId="first-name" />
          <BorrowerTextField label="Last Name" value={fields.lastName} isEditing={isEditing} onChange={setField("lastName")} testId="last-name" />
          <BorrowerTextField label="SSN" value={fields.ssn} isEditing={isEditing} onChange={setField("ssn")} testId="ssn" placeholder="XXX-XX-XXXX" />
          <BorrowerTextField label="Date of Birth" value={fields.dateOfBirth} isEditing={isEditing} onChange={setField("dateOfBirth")} testId="date-of-birth" placeholder="MM/DD/YYYY" />
          <BorrowerTextField label="Phone Number" value={fields.phone} isEditing={isEditing} onChange={setField("phone")} testId="phone-number" />
        </div>

        {/* Row 2: Email Address */}
        <div className="flex" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <BorrowerTextField label="Email Address" value={fields.email} isEditing={isEditing} onChange={setField("email")} testId="email-address" />
          <div style={{ flex: "4 4 0" }} />
        </div>

        {/* Row 3: Address */}
        <div className="flex" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <BorrowerTextField label="Address" value={fields.address} isEditing={isEditing} onChange={setField("address")} testId="address" />
          <BorrowerTextField label="City" value={fields.city} isEditing={isEditing} onChange={setField("city")} testId="city" />
          <BorrowerTextField label="State" value={fields.state} isEditing={isEditing} onChange={setField("state")} testId="state" />
          <BorrowerTextField label="Zip" value={fields.zip} isEditing={isEditing} onChange={setField("zip")} testId="zip" />
          <BorrowerTextField label="Phone Number" value={fields.homePhone} isEditing={isEditing} onChange={setField("homePhone")} testId="home-phone" />
        </div>

        {/* Row 4: Marital Status, Dependents, Farm Involvement */}
        <div className="flex" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <BorrowerDropdownField label="Marital Status" value={fields.maritalStatus} isEditing={isEditing} options={MARITAL_STATUS_OPTIONS} onChange={setField("maritalStatus")} testId="marital-status" />
          <BorrowerTextField label="Dependents" value={fields.dependents} isEditing={isEditing} onChange={setField("dependents")} testId="dependents" />
          <BorrowerDropdownField label="Farm Involvement" value={fields.farmInvolvement} isEditing={isEditing} options={FARM_INVOLVEMENT_OPTIONS} onChange={setField("farmInvolvement")} testId="farm-involvement" />
          <div style={{ flex: "2 2 0" }} />
        </div>
      </div>

      {/* Declarations Section */}
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
        <h3
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="section-declarations"
        >
          Declarations
        </h3>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--roads-spacing-component-xl)",
          }}
        >
          {DECLARATION_QUESTIONS.map((q, i) => (
            <RadioGroup
              key={i}
              question={q}
              value={fields.declarations[`q${i}`] ?? ""}
              onChange={setDeclaration(`q${i}`)}
              isEditing={isEditing}
              questionIndex={i}
            />
          ))}
        </div>
      </div>

      {/* Edit / Save / Discard */}
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
              data-testid="button-discard-borrower"
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
              data-testid="button-save-borrower"
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
            data-testid="button-edit-borrower"
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
  );
}
