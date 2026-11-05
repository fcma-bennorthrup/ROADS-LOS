import { describe, expect, it } from "vitest";
import type { LoanApplication } from "./loan-application";
import { calculateSummaryIncomeDebt } from "./summary-income-debt";

function application(sections: Record<string, unknown> = {}, borrowerCount = 1): LoanApplication {
  return {
    // Deliberately poisonous legacy summary values: never use these as fallbacks.
    loan: { piti: "99", dti: "99" },
    borrowers: Array.from({ length: borrowerCount }, (_, i) => ({ id: `b${i}` })),
    sections: {
      income: [{ incomeSources: [{ totalMonthlyIncome: "$5,000.00" }] }],
      "current-liabilities": [],
      "noncurrent-liabilities": [],
      ...sections,
    },
  } as unknown as LoanApplication;
}

describe("saved summary income and debt", () => {
  it("includes both borrowers, all sources and both liability arrays once", () => {
    const app = application({
      income: [
        { incomeSources: [{ totalMonthlyIncome: "4000" }, { totalYearlyIncome: "12000" }] },
        { incomeSources: [{ baseEmploymentIncome: "48,000", overtime: "12000", other: "" }] },
      ],
      "current-liabilities": [
        { id: "credit", monthlyPayment: "$100", toBePaidOff: "No" },
      ],
      "noncurrent-liabilities": [{ id: "auto", monthlyPayment: "400", toBePaidOff: "No" }],
    }, 2);
    const before = JSON.stringify(app);
    expect(calculateSummaryIncomeDebt(app, 2000)).toEqual({
      monthlyIncome: 10000, monthlyDebt: 500, piti: 2000, dti: 25, missing: [],
    });
    expect(JSON.stringify(app)).toBe(before);
  });

  it("prefers monthly, then yearly, then annual components, without double counting totals", () => {
    const app = application({ income: [{ incomeSources: [
      { totalMonthlyIncome: "1000", totalYearlyIncome: "999999", baseEmploymentIncome: "999999" },
      { totalMonthlyIncome: "", totalYearlyIncome: "24000", baseEmploymentIncome: "999999" },
      { baseEmploymentIncome: "12000", overtime: "1200", bonuses: "600", commissions: "600", other: "0" },
    ] }] });
    expect(calculateSummaryIncomeDebt(app, 420).monthlyIncome).toBe(4200);
    expect(calculateSummaryIncomeDebt(app, 420).piti).toBe(420);
  });

  it("distinguishes explicit zero from absent/blank income and debt", () => {
    const zero = application({ income: [{ incomeSources: [{ totalMonthlyIncome: "0" }] }] });
    expect(calculateSummaryIncomeDebt(zero, 0)).toMatchObject({
      monthlyIncome: 0, monthlyDebt: 0, piti: 0, dti: null,
    });
    expect(calculateSummaryIncomeDebt(zero, 0).missing.join(" ")).toContain("positive");
    for (const income of [undefined, [], [{ incomeSources: [] }], [{ incomeSources: [{}] }]]) {
      expect(calculateSummaryIncomeDebt(application({ income }), 0).monthlyIncome).toBeNull();
    }
    const absentDebt = calculateSummaryIncomeDebt(application({ "current-liabilities": undefined }), 0);
    expect(absentDebt.monthlyDebt).toBeNull();
    expect(absentDebt.piti).toBe(0);
    expect(absentDebt.dti).toBeNull();
    expect(calculateSummaryIncomeDebt(application({
      "current-liabilities": [{ monthlyPayment: "0", toBePaidOff: "No" }],
    }), 0)).toMatchObject({ monthlyDebt: 0, piti: 0, dti: 0 });
  });

  it("does not present partial borrower income as a complete denominator", () => {
    const result = calculateSummaryIncomeDebt(application({}, 2), 1000);
    expect(result).toMatchObject({ monthlyIncome: null, monthlyDebt: 0, piti: 1000, dti: null });
    expect(result.missing.join(" ")).toContain("borrower 2");
    expect(calculateSummaryIncomeDebt(application({}, 0), 1000).monthlyIncome).toBeNull();
    expect(calculateSummaryIncomeDebt(application({
      income: [{ incomeSources: [{ totalMonthlyIncome: "5000" }] }, { incomeSources: [] }],
    }), 1000).monthlyIncome).toBeNull();
  });

  it("rejects invalid explicit income without falling back or guessing frequencies", () => {
    for (const value of ["bad", "-1", "Infinity", "12abc"]) {
      const result = calculateSummaryIncomeDebt(application({
        income: [{ incomeSources: [{ totalMonthlyIncome: value, totalYearlyIncome: "60000" }] }],
      }), 1000);
      expect(result.monthlyIncome).toBeNull();
      expect(result.missing.length).toBeGreaterThan(0);
    }
    for (const source of [
      { hourlyRate: "20", hoursPerWeek: "40" },
      { amount: "1000", frequency: "weekly" },
      { baseEmploymentIncome: "bad" },
      { totalMonthlyIncome: "5000", currentJob: "No" },
    ]) {
      expect(calculateSummaryIncomeDebt(application({
        income: [{ incomeSources: [source] }],
      }), 1000).monthlyIncome).toBeNull();
    }
  });

  it("requires saved monthly debt and explicit payoff status; never derives it from a balance", () => {
    for (const row of [
      { unpaidBalance: "10000", toBePaidOff: "No" },
      { monthlyPayment: "", toBePaidOff: "No" },
      { monthlyPayment: "-1", toBePaidOff: "No" },
      { monthlyPayment: "100" },
      { monthlyPayment: "100", toBePaidOff: true },
    ]) {
      const result = calculateSummaryIncomeDebt(application({ "current-liabilities": [row] }), 1000);
      expect(result).toMatchObject({ monthlyIncome: 5000, monthlyDebt: null, piti: 1000, dti: null });
      expect(result.missing.length).toBeGreaterThan(0);
    }
    const plannedPayoff = calculateSummaryIncomeDebt(application({
      "current-liabilities": [{ monthlyPayment: "nonsense", toBePaidOff: "Yes" }],
    }), 1000);
    expect(plannedPayoff.monthlyDebt).toBeNull();
    expect(plannedPayoff.dti).toBeNull();
    expect(plannedPayoff.missing.join(" ")).toContain("planned-payoff");
  });

  it("flags duplicate liability identity rather than double counting or guessing a reconciliation", () => {
    const row = { id: "shared", monthlyPayment: "100", toBePaidOff: "No" };
    const result = calculateSummaryIncomeDebt(application({
      "current-liabilities": [row], "noncurrent-liabilities": [{ ...row }],
    }), 1000);
    expect(result.monthlyDebt).toBeNull();
    expect(result.dti).toBeNull();
    expect(result.missing.join(" ")).toContain("duplicate");
  });

  it("does not guess whether an unpaid mortgage is the subject-property loan", () => {
    expect(calculateSummaryIncomeDebt(application({
      "noncurrent-liabilities": [{ liabilityType: "Mortgage", monthlyPayment: "500", toBePaidOff: "No" }],
    }), 1000)).toMatchObject({ piti: 1000, dti: 30, monthlyDebt: 500 });
  });

  it("preserves known totals when housing is invalid and prevents nonfinite ratios", () => {
    for (const housing of [null, -1, NaN, Infinity]) {
      expect(calculateSummaryIncomeDebt(application(), housing)).toMatchObject({
        monthlyIncome: 5000, monthlyDebt: 0, piti: null, dti: null,
      });
    }
    expect(calculateSummaryIncomeDebt(application({
      income: [{ incomeSources: [{ totalMonthlyIncome: Number.MAX_VALUE }, { totalMonthlyIncome: Number.MAX_VALUE }] }],
    }), 1000).monthlyIncome).toBeNull();
    expect(calculateSummaryIncomeDebt(application({
      income: [{ incomeSources: [{ totalMonthlyIncome: Number.MIN_VALUE }] }],
    }), 1000)).toMatchObject({ piti: 1000, dti: null });
  });
});
