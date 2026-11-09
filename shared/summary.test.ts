import { describe, expect, it } from "vitest";
import { applicationView, type LoanApplication } from "./loan-application";
import { calculateSummary } from "./summary";

function savedApplication(): LoanApplication {
  return {
    loan: { id: "summary-test", financedFees: "999", totalLoanAmount: "999999", piti: "99", apr: "99", cashReserves: "99999", pweCbScore: 800 },
    borrowers: [{ id: "borrower" }], mode: "existing", generation: 0, revision: 0,
    sections: {
      "loan-details": { requestedLoanAmount: "100000" },
      fees: [],
      "evaluation-1": { estimatedValue: "200000" },
      income: [{ incomeSources: [{ totalMonthlyIncome: "5000" }] }],
      "current-liabilities": [], "noncurrent-liabilities": [],
      "storage:loan-checklist-statuses:summary-test": JSON.stringify({
        "Rate Lock": ["complete"],
        __lockedPricing: {
          version: 1, productType: "fixed", productId: "4374", productLabel: "30 year fixed",
          catalogTerm: 360, termOverride: null, baseRate: 6, adjustments: 0, discounts: 0,
          finalRate: 6, expiration: "2027-01-01",
        },
      }),
    },
  } as unknown as LoanApplication;
}

describe("saved Summary projection", () => {
  it("adds L/CV percentage points to saved amortization years", () => {
    const app = savedApplication();
    app.sections["loan-details"] = { requestedLoanAmount: "160000" };
    delete app.sections["storage:loan-checklist-statuses:summary-test"];
    Object.assign(app.sections, { "pricing-type": "fixed", "pricing-product": "4374", "pricing-term": null });
    expect(calculateSummary(app).ruleOfXx).toBe("110");
    expect(calculateSummary(app).missing.some(m => m.startsWith("Rule of XX:"))).toBe(false);
    app.sections["pricing-term"] = "180";
    expect(calculateSummary(app).ruleOfXx).toBe("95");
    app.sections["pricing-term"] = "";
    expect(calculateSummary(app).ruleOfXx).toBeNull();
    Object.assign(app.sections, { "pricing-type": "arm", "pricing-product": "4245", "pricing-term": null });
    expect(calculateSummary(app).ruleOfXx).toBeNull();
  });
  it("uses authoritative saved totals for Summary only, not legacy financed fee columns", () => {
    const app = savedApplication();
    const before = JSON.stringify(app);
    const view = applicationView(app);
    expect(view.totalLoanAmount).toBe("100999"); // other pages retain legacy behavior
    expect(view.summary).toMatchObject({
      totalLoanAmount: 100000, financedFees: 0, totalCv: 200000, lcv: 50,
      principalInterest: 599.55, monthlyIncome: 5000, monthlyDebt: 0,
      piti: null, dti: null, apr: null, cashReserves: null, cashToClose: null,
      pweCbScore: null, ruleOfXx: "80",
      pitiBreakdown: { interest: 500, taxes: null, insurance: null, totalHousingCosts: null, grossMonthlyIncome: 5000, percentage: null },
    });
    expect(view.summary.pitiBreakdown.principal).toBeCloseTo(99.55);
    expect(JSON.stringify(app)).toBe(before);
    expect(calculateSummary(JSON.parse(before))).toEqual(view.summary);
  });

  it("preserves zero interest as a known zero but never invents missing taxes or insurance", () => {
    const app = savedApplication();
    const key = "storage:loan-checklist-statuses:summary-test";
    const pricing = JSON.parse(app.sections[key] as string);
    Object.assign(pricing.__lockedPricing, { baseRate: 0, finalRate: 0 });
    app.sections[key] = JSON.stringify(pricing);
    const result = calculateSummary(app);
    expect(result.pitiBreakdown.interest).toBe(0);
    expect(result.pitiBreakdown.principal).toBe(277.78);
    expect(result.piti).toBeNull();
    expect(result.missing.join(" ")).toContain("Monthly Property Taxes");
  });

  it("does not fall back to sample columns when saved inputs are absent", () => {
    const app = savedApplication();
    app.sections = {};
    const result = calculateSummary(app);
    for (const [key, value] of Object.entries(result)) {
      if (key !== "missing" && key !== "pitiBreakdown") expect(value, key).toBeNull();
    }
    expect(Object.values(result.pitiBreakdown).every(value => value === null)).toBe(true);
  });

  it("uses the same monthly costs for the PITI breakdown, housing percentage and DTI", () => {
    const app = savedApplication();
    app.sections["subject-property"] = { monthlyPropertyTaxes: "125.50", monthlyInsurance: "74.50" };
    app.sections["current-liabilities"] = [{ id: "card", monthlyPayment: "100", toBePaidOff: "No" }];
    const result = calculateSummary(app);
    expect(result).toMatchObject({
      principalInterest: 599.55, taxesInsurance: 200, totalMonthlyPayment: 799.55,
      piti: 799.55 / 5000 * 100, dti: 899.55 / 5000 * 100,
      pitiBreakdown: { interest: 500, taxes: 125.5, insurance: 74.5,
        totalHousingCosts: 799.55, grossMonthlyIncome: 5000, percentage: 799.55 / 5000 * 100 },
    });
    expect(result.pitiBreakdown.principal).toBeCloseTo(99.55);
    app.sections["subject-property"] = { monthlyPropertyTaxes: "0", monthlyInsurance: "" };
    expect(calculateSummary(app).pitiBreakdown).toMatchObject({ taxes: 0, insurance: null, percentage: null });
  });
});
