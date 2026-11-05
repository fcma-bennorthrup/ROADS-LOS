import { describe, expect, it } from "vitest";
import type { LoanApplication } from "./loan-application";
import { calculateSummaryPayments } from "./summary-payments";

function application(sections: Record<string, unknown> = {}): LoanApplication {
  return {
    loan: {
      id: "payments-test", amountRequested: "145000", financedFees: "4455",
      totalLoanAmount: "149455", product: "Sample product", finalRate: "6.5",
      principalInterest: "999", taxesInsurance: "1000", totalMonthlyPayment: "1999", apr: "6.6",
    },
    borrowers: [], mode: "existing", generation: 0, revision: 0, sections,
  } as unknown as LoanApplication;
}

function lock(overrides: Record<string, unknown> = {}, status = "complete") {
  return JSON.stringify({
    "Rate Lock": [status],
    __lockedPricing: {
      version: 1, productType: "fixed", productId: "4374", productLabel: "4374 - 30 year fixed",
      catalogTerm: 360, termOverride: null, baseRate: 6, adjustments: 0.25,
      discounts: 0.25, finalRate: 6, expiration: "2027-01-01", ...overrides,
    },
  });
}

function ready(overrides: Record<string, unknown> = {}) {
  return application({
    "loan-details": { requestedLoanAmount: "$100,000.00" }, fees: [],
    "storage:loan-checklist-statuses:payments-test": lock(overrides),
  });
}

describe("saved summary payments", () => {
  it("never uses sample summary columns or defaults as authoritative inputs", () => {
    const result = calculateSummaryPayments(application());
    for (const [field, value] of Object.entries(result)) {
      if (field !== "missing") expect(value, field).toBeNull();
    }
    expect(result.missing.some(reason => reason.startsWith("amountRequested:"))).toBe(true);
    expect(result.missing.some(reason => reason.startsWith("financedFees:"))).toBe(true);
  });

  it("amortizes a confirmed fixed product using saved principal and catalog months", () => {
    expect(calculateSummaryPayments(ready())).toMatchObject({
      amountRequested: 100000, financedFees: 0, totalLoanAmount: 100000,
      product: "4374 - 30 year fixed", finalRate: 6, principalInterest: 599.55,
      taxesInsurance: null, totalMonthlyPayment: null, apr: null,
    });
  });

  it("uses saved overrides and supports zero interest without dividing by zero", () => {
    expect(calculateSummaryPayments(ready({ termOverride: "120" })).principalInterest).toBe(1110.21);
    expect(calculateSummaryPayments(ready({
      baseRate: 0, adjustments: 0, discounts: 0, finalRate: 0, termOverride: "120",
    })).principalInterest).toBe(833.33);
  });

  it.each(["", " ", "0", "-1", "1.5", "360 months", "Infinity", "1e3"])(
    "does not replace unsupported term override %j with a catalog default", termOverride => {
      const result = calculateSummaryPayments(ready({ termOverride }));
      expect(result.principalInterest).toBeNull();
      expect(result.finalRate).toBe(6);
      expect(result.missing.some(reason => reason.startsWith("principalInterest:"))).toBe(true);
    },
  );

  it("does not confuse ARM initial fixed-rate months with amortization months", () => {
    const result = calculateSummaryPayments(ready({
      productType: "arm", productId: "4245", productLabel: "4245 - 5/1 ARM 2/6 caps",
      catalogTerm: 60, termOverride: "360",
    }));
    expect(result.product).toContain("ARM");
    expect(result.finalRate).toBe(6);
    expect(result.principalInterest).toBeNull();
    expect(result.missing.some(reason => reason.includes("ARM amortization"))).toBe(true);
  });

  it.each([
    lock({}, "not-started"), lock({ version: 2 }), lock({ finalRate: 7 }),
    lock({ productId: "unknown" }), lock({ termOverride: undefined }),
    lock({ catalogTerm: 0 }), lock({ finalRate: -1, baseRate: -1 }),
    lock({ productLabel: "" }), "{broken",
  ])("rejects unconfirmed, legacy, corrupt or inconsistent pricing", raw => {
    const app = ready();
    app.sections["storage:loan-checklist-statuses:payments-test"] = raw;
    expect(calculateSummaryPayments(app)).toMatchObject({ product: null, finalRate: null, principalInterest: null });
  });

  it("does not derive a final rate from saved draft product/term or another loan's lock", () => {
    const app = application({
      "pricing-type": "fixed", "pricing-product": "4374", "pricing-term": "360",
      "storage:loan-checklist-statuses:other-loan": lock(),
    });
    expect(calculateSummaryPayments(app)).toMatchObject({ product: null, finalRate: null });
  });

  it("recognizes explicit cash-only fees as not financed without adding LE and CD amounts", () => {
    const app = ready();
    app.sections.fees = [{
      id: "fee", fee: "Origination Fee", leAmount: "$200", cdAmount: "$300",
      methodOfPayment: "Cash", paidBy: "Buyer",
    }];
    expect(calculateSummaryPayments(app)).toMatchObject({ financedFees: 0, totalLoanAmount: 100000, principalInterest: 599.55 });
  });

  it.each([
    undefined, null, {}, [null],
    [{ leAmount: "10", cdAmount: "10", paidBy: "Buyer", methodOfPayment: "Financed" }],
    [{ leAmount: "10", cdAmount: "invalid", paidBy: "Buyer", methodOfPayment: "Cash" }],
    [{ leAmount: "10", cdAmount: "10", paidBy: "", methodOfPayment: "Cash" }],
  ])("does not assume zero financed fees for unsupported fee data %j", fees => {
    const app = ready();
    app.sections.fees = fees;
    expect(calculateSummaryPayments(app)).toMatchObject({ financedFees: null, totalLoanAmount: null, principalInterest: null });
  });

  it.each(["", "n/a", "-1", "Infinity"])("rejects invalid saved principal %j without a sample fallback", requestedLoanAmount => {
    const app = ready();
    app.sections["loan-details"] = { requestedLoanAmount };
    expect(calculateSummaryPayments(app)).toMatchObject({ amountRequested: null, totalLoanAmount: null, principalInterest: null });
  });

  it("preserves explicitly saved zero amounts and is pure across serialization", () => {
    const app = ready();
    app.sections["loan-details"] = { requestedLoanAmount: "0" };
    const before = JSON.stringify(app);
    expect(calculateSummaryPayments(app)).toMatchObject({ amountRequested: 0, totalLoanAmount: 0, principalInterest: 0 });
    expect(JSON.stringify(app)).toBe(before);
    expect(calculateSummaryPayments(JSON.parse(before))).toEqual(calculateSummaryPayments(app));
  });

  it("reports APR and recurring-payment blockers even when a closing date and zero fees are saved", () => {
    const app = ready();
    app.sections["closing-details"] = { closingDate: "2027-01-01", preClosingReviewComplete: true };
    const result = calculateSummaryPayments(app);
    expect(result.apr).toBeNull();
    expect(result.taxesInsurance).toBeNull();
    expect(result.totalMonthlyPayment).toBeNull();
    expect(result.missing.find(reason => reason.startsWith("apr:"))).toMatch(/classifications.*timing.*schedule/);
    expect(result.missing.some(reason => reason.startsWith("principalInterest:"))).toBe(false);
  });
});
