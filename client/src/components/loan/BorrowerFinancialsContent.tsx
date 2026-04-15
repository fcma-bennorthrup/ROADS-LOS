import { useState } from "react";
import { ChevronUp, ChevronDown, Pencil, Calendar } from "lucide-react";
import { BalanceSheetSection } from "./BalanceSheetSection";
import { RoadsDropdown } from "./RoadsDropdown";

interface IncomeSourceData {
  id: string;
  incomeType: string;
  employer: string;
  titlePosition: string;
  currentJob: string;
  startDate: string;
  endDate: string;
  yearsEmployed: string;
  yearsInLineOfWork: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  baseEmploymentIncome: string;
  overtime: string;
  bonuses: string;
  commissions: string;
  other: string;
  totalMonthlyIncome: string;
  totalYearlyIncome: string;
}

const DEFAULT_INCOME_SOURCE: IncomeSourceData = {
  id: "",
  incomeType: "W2",
  employer: "",
  titlePosition: "",
  currentJob: "Yes",
  startDate: "",
  endDate: "",
  yearsEmployed: "",
  yearsInLineOfWork: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  baseEmploymentIncome: "",
  overtime: "",
  bonuses: "",
  commissions: "",
  other: "",
  totalMonthlyIncome: "$0.00",
  totalYearlyIncome: "$0.00",
};

interface Borrower {
  name: string;
  isPrimaryWageEarner: boolean;
  incomeSources: IncomeSourceData[];
}

function IncomeField({
  label,
  value,
  width,
  isEditing,
  onChange,
  type,
  hasTrailingIcon,
  hasLeadingIcon,
  isCalculated,
}: {
  label: string;
  value: string;
  width?: string;
  isEditing: boolean;
  onChange?: (value: string) => void;
  type?: "text" | "dropdown" | "date";
  hasTrailingIcon?: boolean;
  hasLeadingIcon?: boolean;
  isCalculated?: boolean;
}) {
  const fieldType = type || "text";
  const effectiveEditing = isCalculated ? false : isEditing;

  return (
    <div
      className="flex flex-col"
      style={{ width: width || "288px", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`field-${label.toLowerCase().replace(/[\s\/]+/g, "-")}`}
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
          backgroundColor: effectiveEditing ? "var(--roads-bg-primary)" : "var(--roads-bg-light)",
          border: effectiveEditing
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
        {effectiveEditing ? (
          fieldType === "dropdown" ? (
            <RoadsDropdown
              value={value}
              onChange={(v) => onChange?.(v)}
              options={
                label === "Income Type"
                  ? [
                      { value: "W2", label: "W2" },
                      { value: "1099", label: "1099" },
                      { value: "Self-Employment", label: "Self-Employment" },
                      { value: "Other", label: "Other" },
                    ]
                  : label === "Current Job?"
                  ? [
                      { value: "Yes", label: "Yes" },
                      { value: "No", label: "No" },
                    ]
                  : []
              }
              variant="inline"
              testId={`select-${label.toLowerCase().replace(/[\s\/]+/g, "-")}`}
            />
          ) : (
            <input
              type={fieldType === "date" ? "date" : "text"}
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
                height: "20px",
              }}
              data-testid={`input-${label.toLowerCase().replace(/[\s\/]+/g, "-")}`}
            />
          )
        ) : (
          <span
            style={{
              flex: 1,
              fontFamily: "var(--roads-font-family)",
              fontSize: "16px",
              fontWeight: 600,
              lineHeight: "20px",
              color: "var(--roads-text-primary)",
              minHeight: "20px",
              display: "block",
            }}
          >
            {value || "\u00A0"}
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

function IncomeSourceCard({
  source,
  isEditing,
  onEdit,
  onSave,
  onDiscard,
  onChange,
  index,
}: {
  source: IncomeSourceData;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onChange: (field: keyof IncomeSourceData, value: string) => void;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const title = `${source.incomeType}${source.employer ? ` - ${source.employer}` : ""}`;
  const showEndDate = source.currentJob === "No";

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: "var(--roads-bg-light)",
        borderRadius: "var(--roads-radius-2xs)",
      }}
      data-testid={`income-source-card-${index}`}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--roads-spacing-component-l) var(--roads-spacing-component-m)",
          cursor: "pointer",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`income-source-header-${index}`}
      >
        <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <span
            className="body-200-strong"
            style={{ color: "var(--roads-text-primary)" }}
            data-testid={`text-income-source-title-${index}`}
          >
            {title}
          </span>
          {source.currentJob === "Yes" && (
            <div
              className="body-200-strong flex items-center"
              style={{
                backgroundColor: "var(--roads-bg-dark)",
                color: "var(--roads-text-primary)",
                padding: "0 var(--roads-spacing-component-xs)",
                borderRadius: "var(--roads-radius-2xs)",
                height: "20px",
              }}
              data-testid={`chip-current-job-${index}`}
            >
              Current Job
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp style={{ width: 20, height: 20, color: "var(--roads-icon-dark)" }} />
        ) : (
          <ChevronDown style={{ width: 20, height: 20, color: "var(--roads-icon-dark)" }} />
        )}
      </div>

      {isExpanded && (
        <div
          className="flex flex-col"
          style={{ padding: "0 0 var(--roads-spacing-component-l) 0" }}
        >
          <div
            className="flex flex-col"
            style={{ gap: "var(--roads-spacing-component-3xl)", padding: "0 0 0 0" }}
          >
            <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl) var(--roads-spacing-component-3xl)", padding: "0 var(--roads-spacing-component-l)" }}>
              <IncomeField label="Income Type" value={source.incomeType} isEditing={isEditing} onChange={(v) => onChange("incomeType", v)} type="dropdown" />
              <IncomeField label="Employer" value={source.employer} isEditing={isEditing} onChange={(v) => onChange("employer", v)} />
              <IncomeField label="Title/Position" value={source.titlePosition} isEditing={isEditing} onChange={(v) => onChange("titlePosition", v)} />
              <IncomeField label="Current Job?" value={source.currentJob} isEditing={isEditing} onChange={(v) => onChange("currentJob", v)} type="dropdown" />
              <IncomeField label="Start Date" value={source.startDate} isEditing={isEditing} onChange={(v) => onChange("startDate", v)} type="date" hasTrailingIcon />
              {showEndDate && (
                <IncomeField label="End Date" value={source.endDate} isEditing={isEditing} onChange={(v) => onChange("endDate", v)} type="date" hasTrailingIcon />
              )}
              <IncomeField label="Years Employed" value={source.yearsEmployed} isEditing={isEditing} onChange={(v) => onChange("yearsEmployed", v)} />
              <IncomeField label="Years in Line of Work" value={source.yearsInLineOfWork} isEditing={isEditing} onChange={(v) => onChange("yearsInLineOfWork", v)} />
            </div>

            <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl) var(--roads-spacing-component-3xl)", padding: "0 var(--roads-spacing-component-l)" }}>
              <IncomeField label="Address 1" value={source.address1} isEditing={isEditing} onChange={(v) => onChange("address1", v)} />
              <IncomeField label="Address 2" value={source.address2} isEditing={isEditing} onChange={(v) => onChange("address2", v)} />
              <IncomeField label="City" value={source.city} isEditing={isEditing} onChange={(v) => onChange("city", v)} />
              <div
                className="flex"
                style={{ width: "288px", gap: "var(--roads-spacing-component-l)" }}
                data-testid="field-state-zip"
              >
                <IncomeField label="State" value={source.state} width="136px" isEditing={isEditing} onChange={(v) => onChange("state", v)} />
                <IncomeField label="Zip" value={source.zip} width="136px" isEditing={isEditing} onChange={(v) => onChange("zip", v)} />
              </div>
              <IncomeField label="Phone Number" value={source.phone} isEditing={isEditing} onChange={(v) => onChange("phone", v)} />
            </div>

            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
              <div
                className="flex items-center"
                style={{
                  padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-m)",
                  borderBottom: "1px solid var(--roads-border-subtle)",
                }}
              >
                <span
                  className="body-200-strong"
                  style={{ color: "var(--roads-text-primary)" }}
                  data-testid={`text-annual-income-header-${index}`}
                >
                  Annual Income
                </span>
              </div>

              <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl) var(--roads-spacing-component-3xl)", padding: "0 var(--roads-spacing-component-l)" }}>
                <IncomeField label="Base Employment Income" value={source.baseEmploymentIncome} width="287px" isEditing={isEditing} onChange={(v) => onChange("baseEmploymentIncome", v)} hasLeadingIcon />
                <IncomeField label="Overtime" value={source.overtime} width="287px" isEditing={isEditing} onChange={(v) => onChange("overtime", v)} hasLeadingIcon />
                <IncomeField label="Bonuses" value={source.bonuses} width="287px" isEditing={isEditing} onChange={(v) => onChange("bonuses", v)} hasLeadingIcon />
                <IncomeField label="Commissions" value={source.commissions} width="287px" isEditing={isEditing} onChange={(v) => onChange("commissions", v)} hasLeadingIcon />
                <IncomeField label="Other" value={source.other} width="287px" isEditing={isEditing} onChange={(v) => onChange("other", v)} hasLeadingIcon />
              </div>

              <div className="flex flex-wrap" style={{ gap: "var(--roads-spacing-component-3xl) var(--roads-spacing-component-3xl)", padding: "0 var(--roads-spacing-component-l)" }}>
                <IncomeField label="Total Monthly Income" value={source.totalMonthlyIncome} width="287px" isEditing={false} isCalculated hasLeadingIcon />
                <IncomeField label="Total Yearly Income" value={source.totalYearlyIncome} width="287px" isEditing={false} isCalculated hasLeadingIcon />
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-end"
            style={{ padding: "var(--roads-spacing-component-l) var(--roads-spacing-component-l) 0" }}
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
                data-testid={`button-edit-income-${index}`}
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
                  data-testid={`button-discard-income-${index}`}
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
                  data-testid={`button-save-income-${index}`}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const SAMPLE_BORROWERS: Borrower[] = [
  {
    name: "Richard Jamerson",
    isPrimaryWageEarner: true,
    incomeSources: [
      {
        ...DEFAULT_INCOME_SOURCE,
        id: "1",
        incomeType: "W2",
        employer: "Baskin Robins",
        titlePosition: "Manager",
        currentJob: "Yes",
        startDate: "2019-03-15",
        yearsEmployed: "6",
        yearsInLineOfWork: "12",
        address1: "123 Main St",
        address2: "",
        city: "Pittsburgh",
        state: "PA",
        zip: "15201",
        phone: "(412) 555-0100",
        baseEmploymentIncome: "65,000.00",
        overtime: "5,000.00",
        bonuses: "3,000.00",
        commissions: "0.00",
        other: "0.00",
        totalMonthlyIncome: "$6,083.33",
        totalYearlyIncome: "$73,000.00",
      },
    ],
  },
  {
    name: "Jamelle Jamerson",
    isPrimaryWageEarner: false,
    incomeSources: [
      {
        ...DEFAULT_INCOME_SOURCE,
        id: "2",
        incomeType: "W2",
        employer: "Target",
        titlePosition: "Sales Associate",
        currentJob: "Yes",
        startDate: "2021-06-01",
        yearsEmployed: "4",
        yearsInLineOfWork: "8",
        address1: "456 Oak Ave",
        address2: "Suite 200",
        city: "Pittsburgh",
        state: "PA",
        zip: "15213",
        phone: "(412) 555-0200",
        baseEmploymentIncome: "42,000.00",
        overtime: "2,000.00",
        bonuses: "1,000.00",
        commissions: "500.00",
        other: "0.00",
        totalMonthlyIncome: "$3,791.67",
        totalYearlyIncome: "$45,500.00",
      },
    ],
  },
];

export function BorrowerFinancialsContent() {
  const [activeBorrowerIndex, setActiveBorrowerIndex] = useState(0);
  const [borrowers, setBorrowers] = useState<Borrower[]>(SAMPLE_BORROWERS);
  const [editingSourceIndex, setEditingSourceIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<IncomeSourceData | null>(null);

  const activeBorrower = borrowers[activeBorrowerIndex];

  function handleEdit(sourceIndex: number) {
    setEditBuffer({ ...activeBorrower.incomeSources[sourceIndex] });
    setEditingSourceIndex(sourceIndex);
  }

  function handleSave() {
    if (editBuffer === null || editingSourceIndex === null) return;

    const base = parseFloat(editBuffer.baseEmploymentIncome.replace(/,/g, "")) || 0;
    const overtime = parseFloat(editBuffer.overtime.replace(/,/g, "")) || 0;
    const bonuses = parseFloat(editBuffer.bonuses.replace(/,/g, "")) || 0;
    const commissions = parseFloat(editBuffer.commissions.replace(/,/g, "")) || 0;
    const other = parseFloat(editBuffer.other.replace(/,/g, "")) || 0;
    const yearly = base + overtime + bonuses + commissions + other;
    const monthly = yearly / 12;

    const fmt = (n: number) =>
      `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const updated = {
      ...editBuffer,
      totalMonthlyIncome: fmt(monthly),
      totalYearlyIncome: fmt(yearly),
    };

    setBorrowers((prev) => {
      const next = [...prev];
      const sources = [...next[activeBorrowerIndex].incomeSources];
      sources[editingSourceIndex] = updated;
      next[activeBorrowerIndex] = { ...next[activeBorrowerIndex], incomeSources: sources };
      return next;
    });
    setEditingSourceIndex(null);
    setEditBuffer(null);
  }

  function handleDiscard() {
    setEditingSourceIndex(null);
    setEditBuffer(null);
  }

  function handleFieldChange(field: keyof IncomeSourceData, value: string) {
    if (!editBuffer) return;
    setEditBuffer({ ...editBuffer, [field]: value });
  }

  function handleAddIncomeSource() {
    const newSource: IncomeSourceData = {
      ...DEFAULT_INCOME_SOURCE,
      id: String(Date.now()),
    };
    setBorrowers((prev) => {
      const next = [...prev];
      const sources = [...next[activeBorrowerIndex].incomeSources, newSource];
      next[activeBorrowerIndex] = { ...next[activeBorrowerIndex], incomeSources: sources };
      return next;
    });
    const newIndex = activeBorrower.incomeSources.length;
    setEditBuffer({ ...newSource });
    setEditingSourceIndex(newIndex);
  }

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-l)",
      }}
      data-testid="borrower-financials-content"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="heading-borrower-financials"
      >
        Borrower Financials
      </h2>
      <div className="flex" data-testid="borrower-tabs">
        {borrowers.map((borrower, idx) => (
          <button
            key={idx}
            onClick={() => {
              setActiveBorrowerIndex(idx);
              setEditingSourceIndex(null);
              setEditBuffer(null);
            }}
            className="label-strong whitespace-nowrap"
            style={{
              padding: "0 var(--roads-spacing-component-xl)",
              height: "48px",
              display: "flex",
              alignItems: "center",
              color: idx === activeBorrowerIndex
                ? "var(--roads-text-brand)"
                : "var(--roads-text-primary)",
              background: "none",
              border: "none",
              borderBottom: idx === activeBorrowerIndex
                ? "2px solid var(--roads-border-brand)"
                : "1px solid var(--roads-border-subtle)",
              cursor: "pointer",
            }}
            data-testid={`tab-borrower-${idx}`}
          >
            {borrower.name}
          </button>
        ))}
      </div>
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xs)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
            <span
              className="headline-300"
              style={{ color: "var(--roads-text-primary)", paddingLeft: "var(--roads-spacing-component-s)" }}
              data-testid="text-income-title"
            >
              Income
            </span>
            {activeBorrower.isPrimaryWageEarner && (
              <div
                className="body-200-strong flex items-center"
                style={{
                  backgroundColor: "var(--roads-bg-brand-subtle)",
                  color: "var(--roads-text-brand)",
                  padding: "0 var(--roads-spacing-component-xs)",
                  borderRadius: "var(--roads-radius-2xs)",
                  height: "20px",
                }}
                data-testid="chip-primary-wage-earner"
              >
                Primary Wage Earner
              </div>
            )}
          </div>
          <button
            onClick={handleAddIncomeSource}
            className="body-200-strong"
            style={{
              backgroundColor: "var(--roads-bg-primary)",
              border: "1px solid var(--roads-border-dark)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-2xs) var(--roads-spacing-component-l)",
              color: "var(--roads-text-primary)",
              cursor: "pointer",
              height: "32px",
            }}
            data-testid="button-add-income-source"
          >
            + Add Income Source
          </button>
        </div>

        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          {activeBorrower.incomeSources.map((source, idx) => (
            <IncomeSourceCard
              key={source.id}
              source={editingSourceIndex === idx && editBuffer ? editBuffer : source}
              isEditing={editingSourceIndex === idx}
              onEdit={() => handleEdit(idx)}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onChange={handleFieldChange}
              index={idx}
            />
          ))}
        </div>
      </div>
      <BalanceSheetSection />
    </div>
  );
}
