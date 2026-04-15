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

const CITIZENSHIP_STATUS_OPTIONS = [
  { value: "us_citizen", label: "U.S. Citizen" },
  { value: "permanent_resident", label: "Permanent Resident Alien" },
  { value: "non_resident", label: "Non-Permanent Resident Alien" },
];

const CREDIT_SCORE_TYPE_OPTIONS = [
  { value: "fico", label: "FICO" },
  { value: "vantage", label: "VantageScore" },
  { value: "other", label: "Other" },
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
  country: string;
  maritalStatus: string;
  dependents: string;
  dependentsAges: string;
  farmInvolvement: string;
  citizenshipStatus: string;
  creditScoreType: string;
}

interface BorrowerStaticData {
  declarations: Record<string, "yes" | "no">;
  militaryService: "yes" | "no";
  militaryDetails: string[];
  militaryDate: string;
  ethnicity: string[];
  ethnicityOther: string;
  sex: string;
  race: string[];
  howInfoProvided: string;
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

const MILITARY_CHECKBOXES = [
  "Currently serving on active duty with projected expiration date of service/tour",
  "Currently retired, discharged, or separated from service",
  "Only period of service was as a non-activated member of the Reserve or National Guard",
  "Surviving spouse",
];

const ETHNICITY_OPTIONS = [
  "Hispanic or Latino",
  "Not Hispanic or Latino",
  "I do not wish to provide this information",
];

const RACE_OPTIONS = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Native Hawaiian or Other Pacific Islander",
  "White",
  "I do not wish to provide this information",
];

const HOW_PROVIDED_OPTIONS = [
  "Face-to-face interview (includes electronic media w/ video component)",
  "Telephone interview",
  "Fax or mail",
  "Email or internet",
];

interface SeedEntry {
  fields: Partial<BorrowerFields>;
  staticData: BorrowerStaticData;
}

const BORROWER_SEED: Record<string, SeedEntry> = {
  richard: {
    fields: {
      ssn: "123-45-6789",
      dateOfBirth: "01/01/1978",
      address: "106 Kentucky Drive",
      city: "Louisville",
      state: "KY",
      zip: "40234",
      country: "United States",
      maritalStatus: "married",
      dependents: "2",
      dependentsAges: "4, 7",
      farmInvolvement: "primary",
      citizenshipStatus: "us_citizen",
      creditScoreType: "fico",
    },
    staticData: {
      declarations: { q0: "yes", q1: "no", q2: "no", q3: "no", q4: "no", q5: "no", q6: "no", q7: "no", q8: "no", q9: "no", q10: "no", q11: "no", q12: "no", q13: "no" },
      militaryService: "no",
      militaryDetails: [],
      militaryDate: "",
      ethnicity: ["Not Hispanic or Latino"],
      ethnicityOther: "",
      sex: "Male",
      race: ["White"],
      howInfoProvided: "Face-to-face interview (includes electronic media w/ video component)",
    },
  },
  jamelle: {
    fields: {
      ssn: "987-65-4321",
      dateOfBirth: "03/22/1980",
      address: "106 Kentucky Drive",
      city: "Louisville",
      state: "KY",
      zip: "40234",
      country: "United States",
      maritalStatus: "married",
      dependents: "2",
      dependentsAges: "4, 7",
      farmInvolvement: "none",
      citizenshipStatus: "us_citizen",
      creditScoreType: "fico",
    },
    staticData: {
      declarations: { q0: "yes", q1: "no", q2: "no", q3: "no", q4: "no", q5: "no", q6: "no", q7: "no", q8: "no", q9: "no", q10: "no", q11: "no", q12: "no", q13: "no" },
      militaryService: "no",
      militaryDetails: [],
      militaryDate: "",
      ethnicity: ["Not Hispanic or Latino"],
      ethnicityOther: "",
      sex: "Female",
      race: ["Black or African American"],
      howInfoProvided: "Face-to-face interview (includes electronic media w/ video component)",
    },
  },
  priya: {
    fields: {
      ssn: "456-78-9012",
      dateOfBirth: "07/08/1990",
      address: "250 Maple Street",
      city: "Lexington",
      state: "KY",
      zip: "40502",
      country: "United States",
      maritalStatus: "unmarried",
      dependents: "0",
      dependentsAges: "",
      farmInvolvement: "none",
      citizenshipStatus: "permanent_resident",
      creditScoreType: "fico",
    },
    staticData: {
      declarations: { q0: "no", q1: "no", q2: "no", q3: "no", q4: "no", q5: "no", q6: "no", q7: "no", q8: "no", q9: "no", q10: "no", q11: "no", q12: "no", q13: "no" },
      militaryService: "no",
      militaryDetails: [],
      militaryDate: "",
      ethnicity: ["Not Hispanic or Latino"],
      ethnicityOther: "",
      sex: "Female",
      race: ["Asian"],
      howInfoProvided: "Face-to-face interview (includes electronic media w/ video component)",
    },
  },
};

const DEFAULT_SEED: SeedEntry = BORROWER_SEED.richard;

function getSeedKey(borrower: Borrower): string {
  return borrower.name.split(" ")[0].toLowerCase();
}

function borrowerToFields(borrower: Borrower): BorrowerFields {
  const nameParts = borrower.name.trim().split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const seed = (BORROWER_SEED[firstName.toLowerCase()] ?? DEFAULT_SEED).fields;
  return {
    firstName,
    lastName,
    ssn: seed.ssn ?? "123-45-6789",
    dateOfBirth: seed.dateOfBirth ?? "01/01/1985",
    phone: borrower.phone,
    email: borrower.email,
    address: seed.address ?? "123 Main St",
    city: seed.city ?? "Nashville",
    state: seed.state ?? "TN",
    zip: seed.zip ?? "37201",
    country: seed.country ?? "United States",
    maritalStatus: seed.maritalStatus ?? "unmarried",
    dependents: seed.dependents ?? "0",
    dependentsAges: seed.dependentsAges ?? "",
    farmInvolvement: seed.farmInvolvement ?? "none",
    citizenshipStatus: seed.citizenshipStatus ?? "us_citizen",
    creditScoreType: seed.creditScoreType ?? "fico",
  };
}

function ReadOnlyField({ value }: { value: string }) {
  return (
    <div
      className="flex items-center"
      style={{
        backgroundColor: "var(--roads-bg-light)",
        border: "1px solid var(--roads-border-subtle)",
        borderRadius: "var(--roads-radius-2xs)",
        padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
        minHeight: "var(--roads-spacing-layout-xs)",
      }}
    >
      <span className="label-strong" style={{ flex: 1, color: "var(--roads-text-primary)" }}>
        {value || "\u00A0"}
      </span>
    </div>
  );
}

function BorrowerTextField({
  label,
  value,
  isEditing,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange?: (v: string) => void;
  testId?: string;
}) {
  const tid = testId ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div
      className="flex flex-col"
      style={{
        flex: "1 1 288px",
        gap: "var(--roads-spacing-component-xs)",
      }}
      data-testid={`borrower-field-${tid}`}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {label}
      </span>
      {isEditing ? (
        <input
          type="text"
          value={value}
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
            minHeight: "var(--roads-spacing-layout-xs)",
          }}
          data-testid={`input-${tid}`}
        />
      ) : (
        <ReadOnlyField value={value} />
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
  const tid = testId ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const displayLabel = options.find((o) => o.value === value)?.label ?? value;
  return (
    <div
      className="flex flex-col"
      style={{
        flex: "1 1 288px",
        gap: "var(--roads-spacing-component-xs)",
      }}
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
        <ReadOnlyField value={displayLabel} />
      )}
    </div>
  );
}

function StaticRadioGroup({
  question,
  value,
  testId,
}: {
  question: string;
  value: "yes" | "no" | "";
  testId?: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: "var(--roads-spacing-component-l)" }}
      data-testid={testId}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-tertiary)" }}>
        {question}
      </span>
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        {(["yes", "no"] as const).map((opt) => {
          const checked = value === opt;
          return (
            <div
              key={opt}
              className="flex items-center body-100"
              style={{
                gap: "var(--roads-spacing-component-xs)",
                color: "var(--roads-text-tertiary)",
                cursor: "not-allowed",
                opacity: checked ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  width: "var(--roads-spacing-component-l)",
                  height: "var(--roads-spacing-component-l)",
                  borderRadius: "var(--roads-radius-round)",
                  border: "1px solid var(--roads-border-subtle)",
                  backgroundColor: "var(--roads-bg-primary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {checked && (
                  <div
                    style={{
                      width: "var(--roads-spacing-component-xs)",
                      height: "var(--roads-spacing-component-xs)",
                      borderRadius: "var(--roads-radius-round)",
                      backgroundColor: "var(--roads-bg-action-disabled)",
                    }}
                  />
                )}
              </div>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StaticCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div
      className="flex items-start body-100"
      style={{
        gap: "var(--roads-spacing-component-xs)",
        color: "var(--roads-text-tertiary)",
        cursor: "not-allowed",
        opacity: checked ? 1 : 0.6,
      }}
    >
      <div
        style={{
          width: "var(--roads-spacing-component-l)",
          height: "var(--roads-spacing-component-l)",
          flexShrink: 0,
          border: "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-2xs)",
          backgroundColor: checked ? "var(--roads-bg-action-disabled)" : "var(--roads-bg-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "var(--roads-spacing-component-3xs)",
        }}
      >
        {checked && (
          <svg
            viewBox="0 0 12 9"
            fill="none"
            style={{
              width: "var(--roads-spacing-component-m)",
              height: "var(--roads-spacing-component-m)",
              color: "var(--roads-text-reverse)",
            }}
          >
            <path
              d="M1 4L4.5 7.5L11 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span style={{ flex: 1 }}>{label}</span>
    </div>
  );
}

function SectionCard({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <div
      style={{
        backgroundColor: "var(--roads-bg-primary)",
        border: "1px solid var(--roads-border-subtle)",
        borderRadius: "var(--roads-radius-xs)",
        padding: "var(--roads-spacing-component-xl)",
      }}
      data-testid={testId}
    >
      {children}
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
  const savedFieldsMap = useRef<Record<string, BorrowerFields>>(
    JSON.parse(JSON.stringify(defaultFieldsMap))
  );

  const activeBorrower = sorted.find((b) => b.id === activeBorrowerId) ?? sorted[0];
  const fields = fieldsMap[activeBorrowerId] ?? borrowerToFields(activeBorrower);

  if (borrowers.length === 0) {
    return (
      <div
        className="flex items-center justify-center body-100"
        style={{ padding: "var(--roads-spacing-component-3xl)", color: "var(--roads-text-tertiary)" }}
      >
        No borrowers found for this loan.
      </div>
    );
  }

  const activeStaticData = (BORROWER_SEED[getSeedKey(activeBorrower)] ?? DEFAULT_SEED).staticData;

  const setField = <K extends keyof BorrowerFields>(key: K) => (value: BorrowerFields[K]) => {
    setFieldsMap((prev) => ({
      ...prev,
      [activeBorrowerId]: { ...prev[activeBorrowerId], [key]: value },
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
        style={{ borderBottom: "1px solid var(--roads-border-subtle)" }}
        data-testid="borrower-tabs"
      >
        {sorted.map((b) => {
          const isActive = b.id === activeBorrowerId;
          return (
            <button
              key={b.id}
              onClick={() => handleTabChange(b.id)}
              className="flex items-center label-strong"
              style={{
                gap: "var(--roads-spacing-component-xs)",
                padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-m)",
                background: "none",
                border: "none",
                borderBottom: isActive
                  ? "var(--roads-spacing-component-3xs) solid var(--roads-border-brand)"
                  : "var(--roads-spacing-component-3xs) solid var(--roads-border-subtle)",
                cursor: "pointer",
                color: isActive ? "var(--roads-text-brand)" : "var(--roads-text-primary)",
                position: "relative",
                bottom: "-1px",
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
                    padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
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

      {/* Borrower Name Heading */}
      <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
        <h3
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="borrower-name-heading"
        >
          {activeBorrower.name}
        </h3>
        {activeBorrower.isPrimary && (
          <span
            className="caption-100-strong"
            style={{
              backgroundColor: "var(--roads-bg-information-subtle)",
              color: "var(--roads-text-information)",
              borderRadius: "var(--roads-radius-round)",
              padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
            }}
          >
            Primary Borrower
          </span>
        )}
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
        <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
          <BorrowerTextField
            label="First Name"
            value={fields.firstName}
            isEditing={isEditing}
            onChange={setField("firstName")}
            testId="first-name"
          />
          <BorrowerTextField
            label="Last Name"
            value={fields.lastName}
            isEditing={isEditing}
            onChange={setField("lastName")}
            testId="last-name"
          />
          <BorrowerTextField
            label="SSN"
            value={fields.ssn}
            isEditing={isEditing}
            onChange={setField("ssn")}
            testId="ssn"
          />
          <BorrowerTextField
            label="Date of Birth"
            value={fields.dateOfBirth}
            isEditing={isEditing}
            onChange={setField("dateOfBirth")}
            testId="date-of-birth"
          />
          <BorrowerTextField
            label="Phone Number"
            value={fields.phone}
            isEditing={isEditing}
            onChange={setField("phone")}
            testId="phone-number"
          />
        </div>

        {/* Row 2: Email Address */}
        <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
          <BorrowerTextField
            label="Email Address"
            value={fields.email}
            isEditing={isEditing}
            onChange={setField("email")}
            testId="email-address"
          />
          <div style={{ flex: "4 4 288px" }} />
        </div>

        {/* Row 3: Address */}
        <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
          <BorrowerTextField
            label="Address"
            value={fields.address}
            isEditing={isEditing}
            onChange={setField("address")}
            testId="address"
          />
          <BorrowerTextField
            label="City"
            value={fields.city}
            isEditing={isEditing}
            onChange={setField("city")}
            testId="city"
          />
          <BorrowerTextField
            label="State"
            value={fields.state}
            isEditing={isEditing}
            onChange={setField("state")}
            testId="state"
          />
          <BorrowerTextField
            label="Zip"
            value={fields.zip}
            isEditing={isEditing}
            onChange={setField("zip")}
            testId="zip"
          />
          <BorrowerTextField
            label="Country"
            value={fields.country}
            isEditing={isEditing}
            onChange={setField("country")}
            testId="country"
          />
        </div>

        {/* Row 4: Marital Status, Dependents, Dependent's Ages, Farm Involvement */}
        <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
          <BorrowerDropdownField
            label="Marital Status"
            value={fields.maritalStatus}
            isEditing={isEditing}
            options={MARITAL_STATUS_OPTIONS}
            onChange={setField("maritalStatus")}
            testId="marital-status"
          />
          <BorrowerTextField
            label="Dependents"
            value={fields.dependents}
            isEditing={isEditing}
            onChange={setField("dependents")}
            testId="dependents"
          />
          <BorrowerTextField
            label="Dependent's Ages"
            value={fields.dependentsAges}
            isEditing={isEditing}
            onChange={setField("dependentsAges")}
            testId="dependents-ages"
          />
          <BorrowerDropdownField
            label="Farm Involvement"
            value={fields.farmInvolvement}
            isEditing={isEditing}
            options={FARM_INVOLVEMENT_OPTIONS}
            onChange={setField("farmInvolvement")}
            testId="farm-involvement"
          />
          <div style={{ flex: "1 1 288px" }} />
        </div>

        {/* Row 5: Citizenship Status, Credit Score Type */}
        <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl)" }}>
          <BorrowerDropdownField
            label="Citizenship Status"
            value={fields.citizenshipStatus}
            isEditing={isEditing}
            options={CITIZENSHIP_STATUS_OPTIONS}
            onChange={setField("citizenshipStatus")}
            testId="citizenship-status"
          />
          <BorrowerDropdownField
            label="Credit Score Type"
            value={fields.creditScoreType}
            isEditing={isEditing}
            options={CREDIT_SCORE_TYPE_OPTIONS}
            onChange={setField("creditScoreType")}
            testId="credit-score-type"
          />
          <div style={{ flex: "3 3 288px" }} />
        </div>
      </div>

      {/* Edit / Save Changes / Discard Changes */}
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
              Save Changes
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

      {/* Declarations Section — read-only */}
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
        <h3
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="section-declarations"
        >
          Declarations
        </h3>
        <SectionCard testId="declarations-card">
          <div
            className="grid"
            style={{
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--roads-spacing-component-xl)",
            }}
          >
            {DECLARATION_QUESTIONS.map((q, i) => (
              <StaticRadioGroup
                key={i}
                question={q}
                value={activeStaticData.declarations[`q${i}`] ?? "no"}
                testId={`declaration-q${i}`}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Military Service Section — read-only */}
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
        <h3
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="section-military-service"
        >
          Military Service
        </h3>
        <SectionCard testId="military-service-card">
          <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
            <StaticRadioGroup
              question="Did you (or your deceased spouse) ever serve, or are you currently serving in the United States Armed Forces?"
              value={activeStaticData.militaryService}
              testId="military-service-question"
            />
            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-m)" }}>
              <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
                If yes, check all that apply:
              </span>
              <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-m)" }}>
                {MILITARY_CHECKBOXES.map((detail) => (
                  <StaticCheckbox
                    key={detail}
                    checked={activeStaticData.militaryDetails.includes(detail)}
                    label={detail}
                  />
                ))}
              </div>
              <div
                className="flex flex-col"
                style={{ gap: "var(--roads-spacing-component-xs)" }}
              >
                <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
                  Date
                </span>
                <ReadOnlyField value={activeStaticData.militaryDate || "\u00A0"} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Demographic Information Section — read-only */}
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
        <h3
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="section-demographic-information"
        >
          Demographic Information
        </h3>
        <SectionCard testId="demographic-information-card">
          <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
            {/* Ethnicity */}
            <div
              className="flex flex-col"
              style={{ gap: "var(--roads-spacing-component-xs)" }}
            >
              <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
                Ethnicity (check one or more)
              </span>
              <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xs)" }}>
                {ETHNICITY_OPTIONS.map((opt) => (
                  <StaticCheckbox
                    key={opt}
                    checked={activeStaticData.ethnicity.includes(opt)}
                    label={opt}
                  />
                ))}
              </div>
            </div>

            {/* Sex */}
            <div
              className="flex flex-col"
              style={{ gap: "var(--roads-spacing-component-xs)" }}
            >
              <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
                Sex
              </span>
              <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xs)" }}>
                {["Female", "Male"].map((opt) => (
                  <StaticCheckbox
                    key={opt}
                    checked={activeStaticData.sex === opt}
                    label={opt}
                  />
                ))}
              </div>
            </div>

            {/* Race */}
            <div
              className="flex flex-col"
              style={{ gap: "var(--roads-spacing-component-xs)" }}
            >
              <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
                Race (check one or more)
              </span>
              <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xs)" }}>
                {RACE_OPTIONS.map((opt) => (
                  <StaticCheckbox
                    key={opt}
                    checked={activeStaticData.race.includes(opt)}
                    label={opt}
                  />
                ))}
              </div>
            </div>

            {/* How information was provided */}
            <div
              className="flex flex-col"
              style={{ gap: "var(--roads-spacing-component-xs)" }}
            >
              <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
                The Demographic Information was provided through
              </span>
              <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xs)" }}>
                {HOW_PROVIDED_OPTIONS.map((opt) => (
                  <StaticCheckbox
                    key={opt}
                    checked={activeStaticData.howInfoProvided === opt}
                    label={opt}
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
