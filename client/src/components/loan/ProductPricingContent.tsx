import { useState, useMemo, useRef } from "react";
import { HelpCircle, Pencil, Lock, X } from "lucide-react";
import { RoadsDropdown } from "./RoadsDropdown";
import { RoadsDatePicker } from "./RoadsDatePicker";
import rateLockLetterPdf from "@assets/Rate_Lock_Letter_-_Consumer_Redacted_1777397784766.pdf";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProductEntry {
  productType: string;
  productId: string;
  label: string;
  term: number;
  baseRate: number;
}

const productData: ProductEntry[] = [
  { productType: "arm", productId: "4251", label: "4251 - 1/1 ARM 2/6 caps", term: 12, baseRate: 6.25 },
  { productType: "arm", productId: "4243", label: "4243 - 3/1 ARM 2/6 caps", term: 36, baseRate: 6.37 },
  { productType: "arm", productId: "4245", label: "4245 - 5/1 ARM 2/6 caps", term: 60, baseRate: 6.5 },
  { productType: "arm", productId: "4247", label: "4247 - 7/1 ARM 2/6 caps", term: 84, baseRate: 6.5 },
  { productType: "arm", productId: "4240", label: "4240 - 10/1 ARM 9/9caps", term: 120, baseRate: 6.5 },
  { productType: "arm", productId: "4242", label: "4242 - 15/1 ARM 9/9 caps", term: 180, baseRate: 6.75 },
  { productType: "fixed", productId: "4370", label: "4370 - 10 year fixed", term: 120, baseRate: 6.125 },
  { productType: "fixed", productId: "4371", label: "4371 - 15 year fixed", term: 180, baseRate: 6.375 },
  { productType: "fixed", productId: "4372", label: "4372 - 20 year fixed", term: 240, baseRate: 6.625 },
  { productType: "fixed", productId: "4373", label: "4373 - 25 year fixed", term: 300, baseRate: 6.75 },
  { productType: "fixed", productId: "4374", label: "4374 - 30 year fixed", term: 360, baseRate: 6.75 },
];

const totalAdjustments = 0.65;
const totalDiscounts = 0;

const rateAdjustments = [
  { label: "FICO Score", value: "0.025%" },
  { label: "Loan Size", value: "0.000%" },
  { label: "Property Type", value: "0.625%" },
];

const formatRate = (rate: number): string => rate.toFixed(3) + "%";

const getLockDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 45);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

function ProductField({
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
  return (
    <div
      className="flex flex-col"
      style={{ flex: "1 1 0", minWidth: "120px", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`form-field-${label.toLowerCase().replace(/[\s()]+/g, "-")}`}
    >
      <span
        className="label-strong"
        style={{ color: "var(--roads-text-primary)" }}
      >
        {label}
      </span>
      {type === "dropdown" && isEditing ? (
        <RoadsDropdown
          value={value}
          onChange={(v) => onChange?.(v)}
          options={(options || []).map((o) => ({ value: o.value, label: o.label }))}
          testId={`select-${label.toLowerCase().replace(/[\s()]+/g, "-")}`}
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
            height: "44px",
          }}
          data-testid={`input-${label.toLowerCase().replace(/[\s()]+/g, "-")}`}
        />
      ) : (
        <div
          className="flex items-center w-full"
          style={{
            backgroundColor: isEditing ? "var(--roads-bg-primary)" : "var(--roads-bg-light)",
            border: isEditing
              ? "1px solid var(--roads-border-dark)"
              : "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-2xs)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
            height: "44px",
          }}
        >
          <span
            className="label-strong"
            style={{
              flex: 1,
              color: "var(--roads-text-primary)",
              minHeight: "20px",
              display: "block",
            }}
          >
            {displayValue || value || "\u00A0"}
          </span>
        </div>
      )}
    </div>
  );
}

export function ProductPricingContent() {
  const [isEditing, setIsEditing] = useState(false);
  const [productType, setProductType] = useState("fixed");
  const [selectedProductId, setSelectedProductId] = useState("4370");
  const [termOverride, setTermOverride] = useState<string | null>(null);
  const [isRateLocked, setIsRateLocked] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockDate, setLockDate] = useState(getLockDate());

  const filteredProducts = useMemo(
    () => productData.filter((p) => p.productType === productType),
    [productType]
  );

  const currentProduct = useMemo(
    () => productData.find((p) => p.productId === selectedProductId) ?? filteredProducts[0],
    [selectedProductId, filteredProducts]
  );

  const baseRate = currentProduct.baseRate;
  const finalRate = baseRate + totalAdjustments - totalDiscounts;

  const handleProductTypeChange = (value: string) => {
    setProductType(value);
    const firstProduct = productData.filter((p) => p.productType === value)[0];
    if (firstProduct) {
      setSelectedProductId(firstProduct.productId);
      setTermOverride(null);
    }
  };

  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    setTermOverride(null);
  };

  const savedState = useRef({ productType: "fixed", productId: "4370", termOverride: null as string | null });

  const handleEditToggle = () => {
    if (!isEditing) {
      savedState.current = { productType, productId: selectedProductId, termOverride };
    }
    setIsEditing(!isEditing);
  };

  const handleDiscard = () => {
    setProductType(savedState.current.productType);
    setSelectedProductId(savedState.current.productId);
    setTermOverride(savedState.current.termOverride);
    setIsEditing(false);
  };

  const handleLockRate = () => {
    setIsRateLocked(true);
    setIsEditing(false);
    setIsLockModalOpen(false);
  };

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="product-pricing-content"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-product-pricing-title"
      >
        Product &amp; Pricing
      </h2>

      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
        <div
          className="flex items-center"
          style={{
            border: "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-xs)",
            overflow: "hidden",
          }}
          data-testid="rate-breakdown-card"
        >
          <div
            className="flex flex-col items-start justify-center"
            style={{
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRight: "1px solid var(--roads-border-subtle)",
              minWidth: "180px",
            }}
          >
            <span className="label-strong whitespace-nowrap" style={{ color: "var(--roads-text-primary)" }}>
              Rate Breakdown
            </span>
          </div>
          <div
            className="flex items-center justify-between flex-1"
            style={{ padding: "0 var(--roads-spacing-component-l)", minWidth: "160px" }}
          >
            <span className="body-100 whitespace-nowrap" style={{ color: "var(--roads-text-primary)" }}>
              Base Rate
            </span>
            <span className="body-100 whitespace-nowrap" style={{ color: "var(--roads-text-primary)" }} data-testid="text-base-rate">
              {formatRate(baseRate)}
            </span>
          </div>
          <div style={{ padding: "0 var(--roads-spacing-component-xs)" }}>
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>+</span>
          </div>
          <div
            className="flex items-center justify-between flex-1"
            style={{ padding: "0 var(--roads-spacing-component-l)", minWidth: "160px" }}
          >
            <span className="body-100 whitespace-nowrap" style={{ color: "var(--roads-text-primary)" }}>
              Total Adjustments
            </span>
            <span className="body-100 whitespace-nowrap" style={{ color: "var(--roads-text-primary)" }} data-testid="text-total-adjustments">
              {formatRate(totalAdjustments)}
            </span>
          </div>
          <div style={{ padding: "0 var(--roads-spacing-component-xs)" }}>
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>-</span>
          </div>
          <div
            className="flex items-center justify-between flex-1"
            style={{ padding: "0 var(--roads-spacing-component-l)", minWidth: "160px" }}
          >
            <span className="body-100 whitespace-nowrap" style={{ color: "var(--roads-text-primary)" }}>
              Total Discounts
            </span>
            <span className="body-100 whitespace-nowrap" style={{ color: "var(--roads-text-primary)" }} data-testid="text-total-discounts">
              {formatRate(totalDiscounts)}
            </span>
          </div>
          <div style={{ padding: "0 var(--roads-spacing-component-xs)" }}>
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>=</span>
          </div>
          <div
            className="flex items-center justify-between"
            style={{
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-m)",
              backgroundColor: "var(--roads-bg-light)",
              minWidth: "180px",
            }}
          >
            <span className="label-strong whitespace-nowrap" style={{ color: "var(--roads-text-primary)" }}>
              Final Rate
            </span>
            <span
              className="label-strong flex items-center whitespace-nowrap"
              style={{ color: "var(--roads-text-primary)", gap: "var(--roads-spacing-component-2xs)" }}
              data-testid="text-final-rate"
            >
              {formatRate(finalRate)}
              {isRateLocked && <Lock style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} data-testid="icon-rate-locked" />}
            </span>
          </div>
        </div>

        <div className="flex justify-end" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <button
            onClick={() => setIsLockModalOpen(true)}
            className="body-200-strong whitespace-nowrap"
            style={{
              backgroundColor: "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              border: "none",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
              cursor: "pointer",
            }}
            data-testid="button-lock-rate"
          >
            Lock Rate
          </button>
          <button
            onClick={() => window.open(rateLockLetterPdf, "_blank", "noopener,noreferrer")}
            className="body-200-strong whitespace-nowrap"
            style={{
              backgroundColor: "var(--roads-bg-primary)",
              border: "1px solid var(--roads-border-dark)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-m)",
              color: "var(--roads-text-primary)",
              cursor: "pointer",
            }}
            data-testid="button-generate-rate-lock-letter"
          >
            View Rate Lock Letter
          </button>
        </div>

        <div className="flex" style={{ gap: "var(--roads-spacing-layout-xs)" }}>
          <div className="flex flex-col flex-1" style={{ gap: "var(--roads-spacing-component-xl)", minWidth: 0 }}>
            <div className="flex" style={{ gap: "var(--roads-spacing-component-l)" }}>
              <ProductField
                label="Product Type"
                value={productType}
                displayValue={productType === "arm" ? "ARM" : "Fixed"}
                isEditing={isEditing}
                type="dropdown"
                options={[
                  { value: "fixed", label: "Fixed" },
                  { value: "arm", label: "ARM" },
                ]}
                onChange={handleProductTypeChange}
              />
              <ProductField
                label="Product"
                value={selectedProductId}
                displayValue={currentProduct.label}
                isEditing={isEditing}
                type="dropdown"
                options={filteredProducts.map((p) => ({ value: p.productId, label: p.label }))}
                onChange={handleProductChange}
              />
              <ProductField
                label="Term (Months)"
                value={termOverride ?? currentProduct.term.toString()}
                isEditing={isEditing}
                type="text"
                onChange={(v) => setTermOverride(v)}
              />
              <ProductField
                label="Base Rate"
                value={formatRate(baseRate)}
                isEditing={false}
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
                    }}
                    data-testid="button-discard-changes"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handleEditToggle}
                    className="body-200-strong"
                    style={{
                      backgroundColor: "var(--roads-bg-action)",
                      color: "var(--roads-text-reverse)",
                      border: "1px solid var(--roads-bg-action)",
                      borderRadius: "var(--roads-radius-2xs)",
                      padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                    }}
                    data-testid="button-save-changes"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEditToggle}
                  disabled={isRateLocked}
                  className="body-200-strong flex items-center"
                  style={{
                    backgroundColor: "var(--roads-bg-primary)",
                    border: "1px solid var(--roads-border-dark)",
                    borderRadius: "var(--roads-radius-2xs)",
                    padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                    color: "var(--roads-text-primary)",
                    gap: "var(--roads-spacing-component-2xs)",
                    opacity: isRateLocked ? 0.5 : 1,
                    cursor: isRateLocked ? "not-allowed" : "pointer",
                  }}
                  data-testid="button-edit-product"
                >
                  <Pencil style={{ width: 12, height: 12 }} />
                  Edit
                </button>
              )}
            </div>
          </div>

          <div style={{ width: "366px", minWidth: "366px" }} data-testid="rate-adjustments-panel">
            <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)", marginBottom: "var(--roads-spacing-component-xs)" }}>
              <span className="body-100" style={{ color: "var(--roads-text-primary)" }}>
                Rate Adjustments
              </span>
              <HelpCircle style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
            </div>
            <div
              className="flex flex-col"
              style={{
                backgroundColor: "var(--roads-bg-light)",
                borderRadius: "var(--roads-radius-2xs)",
                padding: "var(--roads-spacing-component-xs)",
                gap: "var(--roads-spacing-component-xs)",
              }}
            >
              {rateAdjustments.map((adj) => (
                <div
                  key={adj.label}
                  className="flex items-center justify-between"
                  style={{ padding: "0 var(--roads-spacing-component-xs)" }}
                  data-testid={`rate-adj-${adj.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="body-100" style={{ color: "var(--roads-text-primary)" }}>
                    {adj.label}
                  </span>
                  <span className="body-100" style={{ color: "var(--roads-text-primary)" }} data-testid={`text-rate-adj-value-${adj.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {adj.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isLockModalOpen} onOpenChange={setIsLockModalOpen}>
        <DialogContent
          className="p-0 gap-0 max-w-[600px] overflow-clip [&>button:last-child]:hidden"
          style={{
            borderRadius: "var(--roads-radius-xs)",
          }}
          data-testid="rate-lock-modal"
        >
          <div
            className="flex flex-col"
            style={{
              padding: "var(--roads-spacing-component-xl)",
              borderBottom: "1px solid var(--roads-border-subtle)",
            }}
          >
            <div className="flex items-start justify-between">
              <DialogTitle
                className="headline-200"
                style={{ color: "var(--roads-text-primary)" }}
              >
                {isRateLocked ? "Edit Rate Lock" : "Rate Lock"}
              </DialogTitle>
              <DialogClose asChild>
                <button
                  aria-label="Close rate lock modal"
                  className="flex items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--roads-radius-round)",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                  data-testid="button-close-lock-modal"
                >
                  <X style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
                </button>
              </DialogClose>
            </div>
            <DialogDescription
              className="body-100"
              style={{ color: "var(--roads-text-primary)", marginTop: "var(--roads-spacing-component-2xs)" }}
            >
              Please advise borrower of rate lock fees.
            </DialogDescription>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              padding: "var(--roads-spacing-component-xl)",
              gap: "var(--roads-spacing-component-xl)",
            }}
          >
            <div className="flex flex-col" style={{ width: "312px", gap: "var(--roads-spacing-component-xs)" }}>
              <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
                Rate Lock Expiration Date
              </span>
              <RoadsDatePicker
                value={lockDate}
                onChange={setLockDate}
                disabled={!isRateLocked}
                testId="input-lock-date"
              />
            </div>
          </div>

          <div
            className="flex items-center justify-between"
            style={{
              padding: "var(--roads-spacing-component-xl)",
              borderTop: "1px solid var(--roads-border-subtle)",
            }}
          >
            {isRateLocked ? (
              <div />
            ) : (
              <span className="body-200-strong" style={{ color: "var(--roads-text-primary)" }}>
                Initial Rate Lock Period is 45 days.
              </span>
            )}
            <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-l)" }}>
              <DialogClose asChild>
                <button
                  className="label-strong"
                  style={{
                    padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
                    color: "var(--roads-text-primary)",
                    background: "none",
                    border: "none",
                    borderRadius: "var(--roads-radius-2xs)",
                    cursor: "pointer",
                  }}
                  data-testid="button-cancel-lock"
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                onClick={handleLockRate}
                className="label-strong"
                style={{
                  backgroundColor: "var(--roads-bg-action)",
                  color: "var(--roads-text-reverse)",
                  border: "none",
                  borderRadius: "var(--roads-radius-2xs)",
                  padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
                  cursor: "pointer",
                }}
                data-testid="button-confirm-lock-rate"
              >
                {isRateLocked ? "Update Rate Lock" : "Lock Rate"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
