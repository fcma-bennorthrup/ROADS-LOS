import { useState, useRef, useEffect } from "react";
import { MoreVertical, Pencil, ChevronDown } from "lucide-react";

interface AssetData {
  id: string;
  assetType: string;
  financialInstitution: string;
  accountNumber: string;
  cashOrMarketValue: string;
}

interface LiabilityData {
  id: string;
  liabilityType: string;
  creditorName: string;
  accountNumber: string;
  unpaidBalance: string;
  monthlyPayment: string;
  toBePaidOff: string;
}

const ASSET_TYPES = ["Checking Account", "Savings Account", "Money Market", "CD", "Stocks/Bonds", "Retirement", "Other"];
const LIABILITY_TYPES = ["Credit Card", "Auto Loan", "Student Loan", "Mortgage", "Personal Loan", "Other"];
const PAID_OFF_OPTIONS = ["Yes", "No"];

const DEFAULT_ASSET: AssetData = {
  id: "",
  assetType: "Checking Account",
  financialInstitution: "",
  accountNumber: "",
  cashOrMarketValue: "",
};

const DEFAULT_LIABILITY: LiabilityData = {
  id: "",
  liabilityType: "Credit Card",
  creditorName: "",
  accountNumber: "",
  unpaidBalance: "",
  monthlyPayment: "",
  toBePaidOff: "No",
};

function BalanceSheetField({
  label,
  value,
  isEditing,
  onChange,
  type,
  options,
  hasLeadingDollar,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange?: (value: string) => void;
  type?: "text" | "dropdown";
  options?: string[];
  hasLeadingDollar?: boolean;
}) {
  const fieldType = type || "text";

  return (
    <div
      className="flex flex-col"
      style={{ flex: "1 1 calc(50% - 20px)", minWidth: "200px", gap: "var(--roads-spacing-component-xs)" }}
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
          backgroundColor: isEditing ? "var(--roads-bg-primary)" : "var(--roads-bg-light)",
          border: isEditing
            ? "1px solid var(--roads-border-dark)"
            : "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-2xs)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          gap: "var(--roads-spacing-component-xs)",
        }}
      >
        {hasLeadingDollar && (
          <span
            className="label-strong"
            style={{ color: "var(--roads-text-secondary)", lineHeight: "20px" }}
          >
            $
          </span>
        )}
        {isEditing ? (
          fieldType === "dropdown" ? (
            <select
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
              data-testid={`select-${label.toLowerCase().replace(/[\s\/]+/g, "-")}`}
            >
              {(options || []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
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
        {fieldType === "dropdown" && !isEditing && (
          <ChevronDown
            className="shrink-0"
            style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }}
          />
        )}
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  isEditing,
  onEdit,
  onSave,
  onDiscard,
  onChange,
  onDelete,
  index,
}: {
  asset: AssetData;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onChange: (field: keyof AssetData, value: string) => void;
  onDelete: () => void;
  index: number;
}) {
  const title = `${asset.assetType}${asset.financialInstitution ? ` - ${asset.financialInstitution}` : ""}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: "var(--roads-bg-light)",
        borderRadius: "var(--roads-radius-xs)",
        padding: "var(--roads-spacing-component-l) 0",
        flex: 1,
      }}
      data-testid={`asset-card-${index}`}
    >
      <div className="flex flex-col" style={{ flex: 1 }}>
        <div
          className="flex items-center justify-between"
          style={{ padding: "0 var(--roads-spacing-component-m)", position: "relative" }}
        >
          <span
            className="label-strong"
            style={{ color: "var(--roads-text-primary)", lineHeight: "24px" }}
            data-testid={`text-asset-title-${index}`}
          >
            {title}
          </span>
          <div ref={menuRef} style={{ position: "relative" }}>
            <MoreVertical
              style={{ width: 20, height: 20, color: "var(--roads-icon-dark)", cursor: "pointer" }}
              onClick={() => setMenuOpen((v) => !v)}
              data-testid={`button-more-asset-${index}`}
            />
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  zIndex: 50,
                  backgroundColor: "var(--roads-bg-primary)",
                  borderRadius: "var(--roads-radius-2xs)",
                  boxShadow: "0px 8px 16px rgba(39,51,51,0.24)",
                  padding: "var(--roads-spacing-component-xs)",
                }}
                data-testid={`menu-asset-${index}`}
              >
                <button
                  className="body-100"
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    height: 40,
                    padding: "0 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--roads-text-error)",
                    whiteSpace: "nowrap",
                    borderRadius: "var(--roads-radius-2xs)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--roads-bg-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  data-testid={`button-delete-asset-${index}`}
                >
                  Delete {asset.assetType || "Asset"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex flex-wrap"
          style={{
            gap: "var(--roads-spacing-component-3xl) 40px",
            padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-l)",
          }}
        >
          <BalanceSheetField
            label="Asset Type"
            value={asset.assetType}
            isEditing={isEditing}
            onChange={(v) => onChange("assetType", v)}
            type="dropdown"
            options={ASSET_TYPES}
          />
          <BalanceSheetField
            label="Financial Institution"
            value={asset.financialInstitution}
            isEditing={isEditing}
            onChange={(v) => onChange("financialInstitution", v)}
          />
          <BalanceSheetField
            label="Account Number"
            value={asset.accountNumber}
            isEditing={isEditing}
            onChange={(v) => onChange("accountNumber", v)}
          />
          <BalanceSheetField
            label="Cash or Market Value"
            value={asset.cashOrMarketValue}
            isEditing={isEditing}
            onChange={(v) => onChange("cashOrMarketValue", v)}
            hasLeadingDollar
          />
        </div>
      </div>

      <div
        className="flex items-center justify-end"
        style={{ padding: "0 var(--roads-spacing-component-l)", marginTop: "auto" }}
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
              cursor: "pointer",
            }}
            data-testid={`button-edit-asset-${index}`}
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
              data-testid={`button-discard-asset-${index}`}
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
              data-testid={`button-save-asset-${index}`}
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LiabilityCard({
  liability,
  isEditing,
  onEdit,
  onSave,
  onDiscard,
  onChange,
  onDelete,
  index,
}: {
  liability: LiabilityData;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onChange: (field: keyof LiabilityData, value: string) => void;
  onDelete: () => void;
  index: number;
}) {
  const title = `${liability.liabilityType}${liability.creditorName ? ` - ${liability.creditorName}` : ""}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: "var(--roads-bg-light)",
        borderRadius: "var(--roads-radius-xs)",
        padding: "var(--roads-spacing-component-l) 0",
        flex: 1,
      }}
      data-testid={`liability-card-${index}`}
    >
      <div className="flex flex-col" style={{ flex: 1 }}>
        <div
          className="flex items-center justify-between"
          style={{ padding: "0 var(--roads-spacing-component-m)", position: "relative" }}
        >
          <span
            className="label-strong"
            style={{ color: "var(--roads-text-primary)", lineHeight: "24px" }}
            data-testid={`text-liability-title-${index}`}
          >
            {title}
          </span>
          <div ref={menuRef} style={{ position: "relative" }}>
            <MoreVertical
              style={{ width: 20, height: 20, color: "var(--roads-icon-dark)", cursor: "pointer" }}
              onClick={() => setMenuOpen((v) => !v)}
              data-testid={`button-more-liability-${index}`}
            />
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  zIndex: 50,
                  backgroundColor: "var(--roads-bg-primary)",
                  borderRadius: "var(--roads-radius-2xs)",
                  boxShadow: "0px 8px 16px rgba(39,51,51,0.24)",
                  padding: "var(--roads-spacing-component-xs)",
                }}
                data-testid={`menu-liability-${index}`}
              >
                <button
                  className="body-100"
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    height: 40,
                    padding: "0 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--roads-text-error)",
                    whiteSpace: "nowrap",
                    borderRadius: "var(--roads-radius-2xs)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--roads-bg-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  data-testid={`button-delete-liability-${index}`}
                >
                  Delete {liability.liabilityType || "Liability"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex flex-wrap"
          style={{
            gap: "var(--roads-spacing-component-3xl) 40px",
            padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-l)",
          }}
        >
          <BalanceSheetField
            label="Liability Type"
            value={liability.liabilityType}
            isEditing={isEditing}
            onChange={(v) => onChange("liabilityType", v)}
            type="dropdown"
            options={LIABILITY_TYPES}
          />
          <BalanceSheetField
            label="Creditor Name"
            value={liability.creditorName}
            isEditing={isEditing}
            onChange={(v) => onChange("creditorName", v)}
          />
          <BalanceSheetField
            label="Account Number"
            value={liability.accountNumber}
            isEditing={isEditing}
            onChange={(v) => onChange("accountNumber", v)}
          />
          <BalanceSheetField
            label="Unpaid Balance"
            value={liability.unpaidBalance}
            isEditing={isEditing}
            onChange={(v) => onChange("unpaidBalance", v)}
            hasLeadingDollar
          />
          <BalanceSheetField
            label="Monthly Payment"
            value={liability.monthlyPayment}
            isEditing={isEditing}
            onChange={(v) => onChange("monthlyPayment", v)}
            hasLeadingDollar
          />
          <BalanceSheetField
            label="Will be paid off by closing?"
            value={liability.toBePaidOff}
            isEditing={isEditing}
            onChange={(v) => onChange("toBePaidOff", v)}
            type="dropdown"
            options={PAID_OFF_OPTIONS}
          />
        </div>
      </div>

      <div
        className="flex items-center justify-end"
        style={{ padding: "0 var(--roads-spacing-component-l)", marginTop: "auto" }}
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
              cursor: "pointer",
            }}
            data-testid={`button-edit-liability-${index}`}
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
              data-testid={`button-discard-liability-${index}`}
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
              data-testid={`button-save-liability-${index}`}
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const SAMPLE_CURRENT_ASSETS: AssetData[] = [
  {
    id: "ca-1",
    assetType: "Checking Account",
    financialInstitution: "PNC Bank",
    accountNumber: "987654321",
    cashOrMarketValue: "200,000",
  },
];

const SAMPLE_NON_CURRENT_ASSETS: AssetData[] = [
  {
    id: "nca-1",
    assetType: "Retirement",
    financialInstitution: "Fidelity",
    accountNumber: "112233445",
    cashOrMarketValue: "150,000",
  },
];

const SAMPLE_CURRENT_LIABILITIES: LiabilityData[] = [
  {
    id: "cl-1",
    liabilityType: "Credit Card",
    creditorName: "PNC Bank",
    accountNumber: "987654321",
    unpaidBalance: "2000",
    monthlyPayment: "100",
    toBePaidOff: "No",
  },
];

const SAMPLE_NON_CURRENT_LIABILITIES: LiabilityData[] = [
  {
    id: "ncl-1",
    liabilityType: "Auto Loan",
    creditorName: "Wells Fargo",
    accountNumber: "556677889",
    unpaidBalance: "18,000",
    monthlyPayment: "450",
    toBePaidOff: "No",
  },
];

type EditTarget = {
  category: "currentAssets" | "nonCurrentAssets" | "currentLiabilities" | "nonCurrentLiabilities";
  index: number;
} | null;

type CategoryAsset = "currentAssets" | "nonCurrentAssets";
type CategoryLiability = "currentLiabilities" | "nonCurrentLiabilities";

function BalanceSheetRow({
  assetLabel,
  liabilityLabel,
  assets,
  liabilities,
  assetCategory,
  liabilityCategory,
  editTarget,
  assetBuffer,
  liabilityBuffer,
  onEditAsset,
  onEditLiability,
  onSave,
  onDiscard,
  onAssetFieldChange,
  onLiabilityFieldChange,
  onAddAsset,
  onAddLiability,
  onDeleteAsset,
  onDeleteLiability,
}: {
  assetLabel: string;
  liabilityLabel: string;
  assets: AssetData[];
  liabilities: LiabilityData[];
  assetCategory: CategoryAsset;
  liabilityCategory: CategoryLiability;
  editTarget: EditTarget;
  assetBuffer: AssetData | null;
  liabilityBuffer: LiabilityData | null;
  onEditAsset: (category: CategoryAsset, index: number) => void;
  onEditLiability: (category: CategoryLiability, index: number) => void;
  onSave: () => void;
  onDiscard: () => void;
  onAssetFieldChange: (field: keyof AssetData, value: string) => void;
  onLiabilityFieldChange: (field: keyof LiabilityData, value: string) => void;
  onAddAsset: () => void;
  onAddLiability: () => void;
  onDeleteAsset: (index: number) => void;
  onDeleteLiability: (index: number) => void;
}) {
  const testPrefix = assetLabel.toLowerCase().replace(/[\s-]+/g, "-");

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "stretch" }}
      data-testid={`balance-sheet-row-${testPrefix}`}
    >
      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-s)" }}
        data-testid={`${testPrefix}-section`}
      >
        <div
          className="flex items-center justify-between"
          style={{ paddingLeft: "var(--roads-spacing-component-s)" }}
        >
          <span className="label-strong" style={{ color: "var(--roads-text-primary)", lineHeight: "24px" }} data-testid={`text-${testPrefix}-heading`}>
            {assetLabel}
          </span>
          <button
            onClick={onAddAsset}
            className="label-strong"
            style={{
              backgroundColor: "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              border: "none",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              cursor: "pointer",
            }}
            data-testid={`button-add-${testPrefix}`}
          >
            + Add Asset
          </button>
        </div>
        {assets.map((asset, idx) => (
          <AssetCard
            key={asset.id}
            asset={editTarget?.category === assetCategory && editTarget.index === idx && assetBuffer ? assetBuffer : asset}
            isEditing={editTarget?.category === assetCategory && editTarget.index === idx}
            onEdit={() => onEditAsset(assetCategory, idx)}
            onSave={onSave}
            onDiscard={onDiscard}
            onChange={onAssetFieldChange}
            onDelete={() => onDeleteAsset(idx)}
            index={idx}
          />
        ))}
      </div>

      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-s)" }}
        data-testid={`${liabilityLabel.toLowerCase().replace(/[\s-]+/g, "-")}-section`}
      >
        <div
          className="flex items-center justify-between"
          style={{ paddingLeft: "var(--roads-spacing-component-s)" }}
        >
          <span className="label-strong" style={{ color: "var(--roads-text-primary)", lineHeight: "24px" }} data-testid={`text-${liabilityLabel.toLowerCase().replace(/[\s-]+/g, "-")}-heading`}>
            {liabilityLabel}
          </span>
          <button
            onClick={onAddLiability}
            className="label-strong"
            style={{
              backgroundColor: "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              border: "none",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              cursor: "pointer",
            }}
            data-testid={`button-add-${liabilityLabel.toLowerCase().replace(/[\s-]+/g, "-")}`}
          >
            + Add Liability
          </button>
        </div>
        {liabilities.map((liability, idx) => (
          <LiabilityCard
            key={liability.id}
            liability={editTarget?.category === liabilityCategory && editTarget.index === idx && liabilityBuffer ? liabilityBuffer : liability}
            isEditing={editTarget?.category === liabilityCategory && editTarget.index === idx}
            onEdit={() => onEditLiability(liabilityCategory, idx)}
            onSave={onSave}
            onDiscard={onDiscard}
            onChange={onLiabilityFieldChange}
            onDelete={() => onDeleteLiability(idx)}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}

export function BalanceSheetSection() {
  const [currentAssets, setCurrentAssets] = useState<AssetData[]>(SAMPLE_CURRENT_ASSETS);
  const [nonCurrentAssets, setNonCurrentAssets] = useState<AssetData[]>(SAMPLE_NON_CURRENT_ASSETS);
  const [currentLiabilities, setCurrentLiabilities] = useState<LiabilityData[]>(SAMPLE_CURRENT_LIABILITIES);
  const [nonCurrentLiabilities, setNonCurrentLiabilities] = useState<LiabilityData[]>(SAMPLE_NON_CURRENT_LIABILITIES);

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [assetBuffer, setAssetBuffer] = useState<AssetData | null>(null);
  const [liabilityBuffer, setLiabilityBuffer] = useState<LiabilityData | null>(null);

  function handleEditAsset(category: "currentAssets" | "nonCurrentAssets", index: number) {
    const list = category === "currentAssets" ? currentAssets : nonCurrentAssets;
    setAssetBuffer({ ...list[index] });
    setLiabilityBuffer(null);
    setEditTarget({ category, index });
  }

  function handleEditLiability(category: "currentLiabilities" | "nonCurrentLiabilities", index: number) {
    const list = category === "currentLiabilities" ? currentLiabilities : nonCurrentLiabilities;
    setLiabilityBuffer({ ...list[index] });
    setAssetBuffer(null);
    setEditTarget({ category, index });
  }

  function handleSave() {
    if (!editTarget) return;
    const { category, index } = editTarget;

    if ((category === "currentAssets" || category === "nonCurrentAssets") && assetBuffer) {
      const setter = category === "currentAssets" ? setCurrentAssets : setNonCurrentAssets;
      setter((prev) => {
        const next = [...prev];
        next[index] = { ...assetBuffer };
        return next;
      });
    } else if ((category === "currentLiabilities" || category === "nonCurrentLiabilities") && liabilityBuffer) {
      const setter = category === "currentLiabilities" ? setCurrentLiabilities : setNonCurrentLiabilities;
      setter((prev) => {
        const next = [...prev];
        next[index] = { ...liabilityBuffer };
        return next;
      });
    }

    setEditTarget(null);
    setAssetBuffer(null);
    setLiabilityBuffer(null);
  }

  function handleDiscard() {
    setEditTarget(null);
    setAssetBuffer(null);
    setLiabilityBuffer(null);
  }

  function handleAssetFieldChange(field: keyof AssetData, value: string) {
    if (!assetBuffer) return;
    setAssetBuffer({ ...assetBuffer, [field]: value });
  }

  function handleLiabilityFieldChange(field: keyof LiabilityData, value: string) {
    if (!liabilityBuffer) return;
    setLiabilityBuffer({ ...liabilityBuffer, [field]: value });
  }

  function handleDeleteAsset(category: "currentAssets" | "nonCurrentAssets", index: number) {
    const setter = category === "currentAssets" ? setCurrentAssets : setNonCurrentAssets;
    setter((prev) => prev.filter((_, i) => i !== index));
    if (editTarget?.category === category && editTarget.index === index) {
      setEditTarget(null);
      setAssetBuffer(null);
    }
  }

  function handleDeleteLiability(category: "currentLiabilities" | "nonCurrentLiabilities", index: number) {
    const setter = category === "currentLiabilities" ? setCurrentLiabilities : setNonCurrentLiabilities;
    setter((prev) => prev.filter((_, i) => i !== index));
    if (editTarget?.category === category && editTarget.index === index) {
      setEditTarget(null);
      setLiabilityBuffer(null);
    }
  }

  function handleAddAsset(category: "currentAssets" | "nonCurrentAssets") {
    const newAsset: AssetData = { ...DEFAULT_ASSET, id: String(Date.now()) };
    const setter = category === "currentAssets" ? setCurrentAssets : setNonCurrentAssets;
    const list = category === "currentAssets" ? currentAssets : nonCurrentAssets;
    setter((prev) => [...prev, newAsset]);
    setAssetBuffer({ ...newAsset });
    setLiabilityBuffer(null);
    setEditTarget({ category, index: list.length });
  }

  function handleAddLiability(category: "currentLiabilities" | "nonCurrentLiabilities") {
    const newLiability: LiabilityData = { ...DEFAULT_LIABILITY, id: String(Date.now()) };
    const setter = category === "currentLiabilities" ? setCurrentLiabilities : setNonCurrentLiabilities;
    const list = category === "currentLiabilities" ? currentLiabilities : nonCurrentLiabilities;
    setter((prev) => [...prev, newLiability]);
    setLiabilityBuffer({ ...newLiability });
    setAssetBuffer(null);
    setEditTarget({ category, index: list.length });
  }

  return (
    <div
      className="flex flex-col"
      style={{ gap: "var(--roads-spacing-component-xs)" }}
      data-testid="balance-sheet-section"
    >
      <div className="flex items-center">
        <span
          className="headline-300"
          style={{ color: "var(--roads-text-primary)", paddingLeft: "var(--roads-spacing-component-s)" }}
          data-testid="text-balance-sheet-title"
        >
          Balance Sheet
        </span>
      </div>

      <BalanceSheetRow
        assetLabel="Current Assets"
        liabilityLabel="Current Liabilities"
        assets={currentAssets}
        liabilities={currentLiabilities}
        assetCategory="currentAssets"
        liabilityCategory="currentLiabilities"
        editTarget={editTarget}
        assetBuffer={assetBuffer}
        liabilityBuffer={liabilityBuffer}
        onEditAsset={handleEditAsset}
        onEditLiability={handleEditLiability}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onAssetFieldChange={handleAssetFieldChange}
        onLiabilityFieldChange={handleLiabilityFieldChange}
        onAddAsset={() => handleAddAsset("currentAssets")}
        onAddLiability={() => handleAddLiability("currentLiabilities")}
        onDeleteAsset={(idx) => handleDeleteAsset("currentAssets", idx)}
        onDeleteLiability={(idx) => handleDeleteLiability("currentLiabilities", idx)}
      />

      <div style={{ marginTop: "calc(40px - var(--roads-spacing-component-xs))" }}>
      <BalanceSheetRow
        assetLabel="Non-Current Assets"
        liabilityLabel="Non-Current Liabilities"
        assets={nonCurrentAssets}
        liabilities={nonCurrentLiabilities}
        assetCategory="nonCurrentAssets"
        liabilityCategory="nonCurrentLiabilities"
        editTarget={editTarget}
        assetBuffer={assetBuffer}
        liabilityBuffer={liabilityBuffer}
        onEditAsset={handleEditAsset}
        onEditLiability={handleEditLiability}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onAssetFieldChange={handleAssetFieldChange}
        onLiabilityFieldChange={handleLiabilityFieldChange}
        onAddAsset={() => handleAddAsset("nonCurrentAssets")}
        onAddLiability={() => handleAddLiability("nonCurrentLiabilities")}
        onDeleteAsset={(idx) => handleDeleteAsset("nonCurrentAssets", idx)}
        onDeleteLiability={(idx) => handleDeleteLiability("nonCurrentLiabilities", idx)}
      />
      </div>
    </div>
  );
}
