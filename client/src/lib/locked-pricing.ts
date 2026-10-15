/** Confirmed prototype terms only; never borrower or lending-service data. */
export interface LockedPricing {
  version: 1;
  productType: string;
  productId: string;
  productLabel: string;
  catalogTerm: number;
  termOverride: string | null;
  baseRate: number;
  adjustments: number;
  discounts: number;
  finalRate: number;
  expiration: string;
}

export const LOCKED_PRICING_FIELD = "__lockedPricing";

export function parseLockedPricing(value: unknown): LockedPricing | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  const ids = p.productType === "arm"
    ? ["4251", "4243", "4245", "4247", "4240", "4242"]
    : p.productType === "fixed" ? ["4370", "4371", "4372", "4373", "4374"] : [];
  if (p.version !== 1 || typeof p.productId !== "string" || !ids.includes(p.productId)
    || typeof p.productLabel !== "string" || !p.productLabel
    || (p.termOverride !== null && typeof p.termOverride !== "string")
    || typeof p.expiration !== "string"
    || !["catalogTerm", "baseRate", "adjustments", "discounts", "finalRate"].every(
      key => typeof p[key] === "number" && Number.isFinite(p[key]),
    )) return null;
  if ((p.catalogTerm as number) <= 0 ||
    Math.abs((p.finalRate as number) - ((p.baseRate as number) + (p.adjustments as number) - (p.discounts as number))) > 1e-9) return null;
  // Explicit projection prevents unrelated stored fields being retained.
  return {
    version: 1, productType: p.productType as string, productId: p.productId,
    productLabel: p.productLabel, catalogTerm: p.catalogTerm as number,
    termOverride: p.termOverride as string | null, baseRate: p.baseRate as number,
    adjustments: p.adjustments as number, discounts: p.discounts as number,
    finalRate: p.finalRate as number, expiration: p.expiration,
  };
}

export function loadLockedPricing(storageKey: string): LockedPricing | null {
  try {
    return parseLockedPricing(JSON.parse(localStorage.getItem(storageKey) ?? "{}")?.[LOCKED_PRICING_FIELD]);
  } catch {
    return null;
  }
}
