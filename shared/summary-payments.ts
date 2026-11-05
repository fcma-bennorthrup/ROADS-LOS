import type { LoanApplication } from "./loan-application";
import { currencyAmount } from "./loan-collateral-value";
import { productData, totalAdjustments, totalDiscounts } from "./pricing-catalog";

export interface SummaryPayments {
  totalLoanAmount: number | null;
  amountRequested: number | null;
  financedFees: number | null;
  product: string | null;
  /** Percentage points, not a decimal fraction. */
  finalRate: number | null;
  principalInterest: number | null;
  amortizationMonths: number | null;
  monthlyPropertyTaxes: number | null;
  monthlyInsurance: number | null;
  taxesInsurance: number | null;
  totalMonthlyPayment: number | null;
  apr: number | null;
  /** Human-readable blockers, prefixed by the affected output field. */
  missing: string[];
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

// Deliberately do not import the client locked-pricing parser: its storage
// adapter imports applicationView. Validate the same persisted v1 contract here
// without browser storage, defaults, or a runtime applicationView dependency.
function savedPricing(app: LoanApplication): Record<string, unknown> | null {
  // Confirmed locks retain their saved terms; an unlocked loan uses its saved
  // product selection, never the editor's unsaved defaults.
  const raw = app.sections[`storage:loan-checklist-statuses:${app.loan.id}`];
  let checklist: Record<string, unknown> | null = null;
  try { checklist = typeof raw === "string" ? record(JSON.parse(raw)) : null; } catch { return null; }
  if (!Array.isArray(checklist?.["Rate Lock"]) || checklist["Rate Lock"][0] !== "complete") {
    const product = productData.find(p => p.productId === app.sections["pricing-product"]
      && p.productType === app.sections["pricing-type"]);
    const term = app.sections["pricing-term"];
    if (!product || (term !== undefined && term !== null && typeof term !== "string")) return null;
    return {
      productType: product.productType, productLabel: product.label,
      catalogTerm: product.term, termOverride: term ?? null,
      finalRate: product.baseRate + totalAdjustments - totalDiscounts,
    };
  }
  const p = record(checklist.__lockedPricing);
  if (!p) return null;
  const ids = p.productType === "fixed" ? ["4370", "4371", "4372", "4373", "4374"]
    : p.productType === "arm" ? ["4251", "4243", "4245", "4247", "4240", "4242"] : [];
  if (p.version !== 1 || typeof p.productId !== "string" || !ids.includes(p.productId)
    || typeof p.productLabel !== "string" || !p.productLabel.trim()
    || (p.termOverride !== null && typeof p.termOverride !== "string")
    || typeof p.expiration !== "string"
    || !["catalogTerm", "baseRate", "adjustments", "discounts", "finalRate"].every(
      key => typeof p[key] === "number" && Number.isFinite(p[key]),
    )) return null;
  if ((p.catalogTerm as number) <= 0 || (p.finalRate as number) < 0
    || Math.abs((p.finalRate as number) - ((p.baseRate as number)
      + (p.adjustments as number) - (p.discounts as number))) > 1e-9) return null;
  return p;
}

/**
 * Only saved application inputs are authoritative, not loan-table demo summary
 * columns. The current fee editor persists Cash rows only: an explicit empty
 * list or exclusively valid Cash rows establishes zero financed fees. Missing
 * fees or another payment method cannot establish a financed amount.
 *
 * For supported fixed products, monthly P&I = P*r/(1-(1+r)^-n), r=rate/1200,
 * with P/n at zero interest. Term is the saved override (including a blocking
 * blank), otherwise saved catalog months; ARM catalog months are NOT an
 * amortization term. Payment is rounded once to cents.
 *
 * Recurring taxes and insurance are saved monthly on the subject property,
 * independently of appraisal evaluations. Closing date alone supplies
 * neither an APR payment schedule nor finance-charge classifications. APR
 * therefore remains unavailable even with zero fees and a known note rate.
 */
export function calculateSummaryPayments(app: LoanApplication): SummaryPayments {
  const missing: string[] = [];
  const amountRequested = currencyAmount(record(app.sections["loan-details"])?.requestedLoanAmount);
  if (amountRequested === null) missing.push("amountRequested: save a valid requested loan amount in Loan Details.");

  const fees = app.sections.fees;
  const cashFeesKnown = Array.isArray(fees) && fees.every(value => {
    const fee = record(value);
    return fee?.methodOfPayment === "Cash"
      && typeof fee.paidBy === "string" && fee.paidBy.trim() !== ""
      && currencyAmount(fee.leAmount) !== null && currencyAmount(fee.cdAmount) !== null;
  });
  const financedFees = cashFeesKnown ? 0 : null;
  if (financedFees === null) missing.push("financedFees: save the fee list with valid amounts, payer and supported Cash payment methods; financed-fee allocation is not captured.");
  const sum = amountRequested !== null && financedFees !== null ? amountRequested + financedFees : null;
  const totalLoanAmount = sum !== null && Number.isFinite(sum) ? sum : null;
  if (totalLoanAmount === null) missing.push("totalLoanAmount: requested amount and financed fees are required.");

  const pricing = savedPricing(app);
  const product = pricing ? pricing.productLabel as string : null;
  const finalRate = pricing ? pricing.finalRate as number : null;
  if (!pricing) {
    missing.push("product: save a valid product selection in Product & Pricing.");
    missing.push("finalRate: saved pricing terms are unavailable; locking is not required.");
  }
  let principalInterest: number | null = null;
  let amortizationMonths: number | null = null;
  if (pricing?.productType === "arm") {
    missing.push("principalInterest: ARM amortization term and adjustment/payment schedule are not captured; catalog term is the initial fixed-rate period.");
  } else if (pricing) {
    const rawTerm = pricing.termOverride === null ? pricing.catalogTerm : pricing.termOverride;
    const term = typeof rawTerm === "number" ? rawTerm
      : typeof rawTerm === "string" && /^\d+$/.test(rawTerm.trim()) ? Number(rawTerm.trim()) : NaN;
    if (Number.isSafeInteger(term) && term > 0) amortizationMonths = term;
    if (!Number.isSafeInteger(term) || term <= 0) {
      missing.push("principalInterest: save a positive whole-month fixed-product term; blank overrides are not replaced by catalog defaults.");
    } else if (totalLoanAmount !== null && finalRate !== null) {
      const monthlyRate = finalRate / 1200;
      const payment = monthlyRate === 0 ? totalLoanAmount / term
        : totalLoanAmount * monthlyRate / -Math.expm1(-term * Math.log1p(monthlyRate));
      const rounded = Math.round(payment * 100) / 100;
      if (Number.isFinite(rounded)) principalInterest = rounded;
      else missing.push("principalInterest: saved inputs produce a non-finite payment.");
    }
  }
  if (principalInterest === null && !missing.some(reason => reason.startsWith("principalInterest:"))) {
    missing.push("principalInterest: total loan amount and confirmed fixed-product rate and term are required.");
  }
  const property = record(app.sections["subject-property"]);
  const monthlyPropertyTaxes = currencyAmount(property?.monthlyPropertyTaxes);
  const monthlyInsurance = currencyAmount(property?.monthlyInsurance);
  if (monthlyPropertyTaxes === null) {
    missing.push("taxesInsurance: save valid nonnegative Monthly Property Taxes in Collateral; enter 0 explicitly if none.");
  }
  if (monthlyInsurance === null) {
    missing.push("taxesInsurance: save valid nonnegative Monthly Insurance in Collateral; enter 0 explicitly if none.");
  }
  const recurringSum = monthlyPropertyTaxes !== null && monthlyInsurance !== null
    ? monthlyPropertyTaxes + monthlyInsurance : null;
  const taxesInsurance = recurringSum !== null && Number.isFinite(recurringSum) ? recurringSum : null;
  if (recurringSum !== null && taxesInsurance === null) {
    missing.push("taxesInsurance: saved monthly property-tax and insurance amounts produce a non-finite total.");
  }
  const paymentSum = principalInterest !== null && taxesInsurance !== null ? principalInterest + taxesInsurance : null;
  const totalMonthlyPayment = paymentSum !== null && Number.isFinite(paymentSum)
    ? Math.round(paymentSum * 100) / 100 : null;
  if (totalMonthlyPayment === null || !Number.isFinite(totalMonthlyPayment)) {
    missing.push("totalMonthlyPayment: valid principal and interest plus saved monthly property taxes and insurance are required.");
  }
  missing.push("apr: finance-charge classifications, amount financed, disbursement timing and a complete dated payment schedule are not captured; note rate is not APR.");
  return {
    totalLoanAmount, amountRequested, financedFees, product, finalRate, principalInterest, amortizationMonths,
    monthlyPropertyTaxes, monthlyInsurance, taxesInsurance,
    totalMonthlyPayment: totalMonthlyPayment !== null && Number.isFinite(totalMonthlyPayment) ? totalMonthlyPayment : null,
    apr: null, missing,
  };
}
