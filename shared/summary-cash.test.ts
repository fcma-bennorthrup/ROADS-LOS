import { describe, expect, it } from "vitest";
import type { LoanApplication } from "./loan-application";
import { calculateSummaryCash } from "./summary-cash";

function application(sections: Record<string, unknown> = {}): LoanApplication {
  return {
    loan: {
      id: "cash-test",
      cashReserves: "5000000.00",
      cashToClose: "8732.00",
      pweCbScore: 756,
      ruleOfXx: null,
      financedFees: "4455.00",
      taxesInsurance: "1000.00",
    },
    borrowers: [],
    mode: "existing",
    generation: 0,
    revision: 0,
    sections,
  } as unknown as LoanApplication;
}

function expectUnavailable(app: LoanApplication) {
  const result = calculateSummaryCash(app);
  expect(result).toMatchObject({
    cashReserves: null,
    cashToClose: null,
    pweCbScore: null,
    ruleOfXx: null,
  });
  expect(result.missing).toHaveLength(4);
  return result;
}

describe("Summary cash and credit source boundaries", () => {
  it("does not promote seeded loan outputs to calculated application results", () => {
    expectUnavailable(application());
  });

  it.each(["empty", "blend"] as const)("does not turn %s reset zeros into known results", (mode) => {
    const app = application();
    app.mode = mode;
    Object.assign(app.loan, { cashReserves: "0", cashToClose: "0", pweCbScore: 0 });
    expectUnavailable(app);
  });

  it("does not relabel saved assets or assets minus liabilities as post-closing reserves", () => {
    const result = expectUnavailable(application({
      "current-assets": [
        { id: "checking", assetType: "Checking Account", cashOrMarketValue: "100,000" },
        { id: "savings", assetType: "Savings Account", cashOrMarketValue: "25000" },
      ],
      "noncurrent-assets": [{ id: "retirement", assetType: "Retirement", cashOrMarketValue: "200000" }],
      "current-liabilities": [{ id: "card", unpaidBalance: "2000", monthlyPayment: "100", toBePaidOff: "Yes" }],
    }));
    expect(result.missing[0]).toMatch(/no defined reserve calculation.*post-closing/);
  });

  it("does not infer a complete cash-to-close figure from down payment and fee rows", () => {
    const result = expectUnavailable(application({
      "loan-details": { loanType: "purchase", requestedLoanAmount: "145000", downPaymentAmount: "$50,000.00", downPaymentSource: "cash_on_hand" },
      fees: [
        { id: "appraisal", fee: "Appraisal Fee", leAmount: "500", cdAmount: "600", methodOfPayment: "Cash", paidBy: "Buyer" },
      ],
      "closing-details": { closingDate: "2026-11-10", preClosingReviewComplete: true },
    }));
    expect(result.missing[1]).toMatch(/settlement reconciliation/);
    expect(result.missing[1]).toContain("deposits, credits and payoffs");
  });

  it("does not treat a successful demo credit pull or displayed sample score as a bureau result", () => {
    const app = application({
      "credit-pulled": true,
      "current-liabilities": [{ id: "credit-card", unpaidBalance: "2400", monthlyPayment: "85" }],
    });
    app.loan.pweCbScore = 742;
    const result = expectUnavailable(app);
    expect(result.missing[2]).toMatch(/no sourced credit bureau score or PWE selection policy/);
  });

  it("does not assume an undocumented Rule of XX policy from a loan-level string", () => {
    const app = application();
    app.loan.ruleOfXx = "XX";
    const result = expectUnavailable(app);
    expect(result.missing[3]).toMatch(/no defined formula, policy/);
  });

  it("does not interpret missing or malformed sections as known zero values", () => {
    expectUnavailable(application({
      "current-assets": null,
      "noncurrent-assets": [{ cashOrMarketValue: "invalid" }],
      fees: "invalid",
      "loan-details": {},
      "closing-details": null,
      "credit-pulled": false,
    }));
  });

  it("is pure and gives each call its own explanations array", () => {
    const app = application({ "current-assets": [] });
    const before = structuredClone(app);
    const first = calculateSummaryCash(app);
    const second = calculateSummaryCash(app);
    expect(second).toEqual(first);
    first.missing.length = 0;
    expect(second.missing).toHaveLength(4);
    expect(app).toEqual(before);
  });
});
