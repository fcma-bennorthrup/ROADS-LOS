import { describe, expect, it } from "vitest";
import { applicationView, type LoanApplication } from "./loan-application";
import { collateralValue, loanToCollateralValue } from "./loan-collateral-value";

describe("saved loan to collateral value", () => {
  it("uses total loan including fees, then switches from estimate to report", () => {
    const app = {
      loan: { id: "demo", financedFees: "5000", totalLoanAmount: "1", lcv: "80", totalCv: "250000" },
      borrowers: [], sections: {
        "loan-details": { requestedLoanAmount: "$145,000.00" },
        "evaluation-1": { estimatedValue: "$200,000" },
      },
    } as unknown as LoanApplication;
    expect(applicationView(app)).toMatchObject({ totalLoanAmount: "150000", totalCv: "200000", lcv: "75.00" });
    app.sections["evaluation-1"] = { estimatedValue: "200000", reportedValueTotal: "240000" };
    expect(applicationView(app)).toMatchObject({ totalCv: "240000", lcv: "62.50" });
    app.sections["evaluation-1"] = { estimatedValue: "200000", reportedValueTotal: "" };
    expect(applicationView(app).lcv).toBe("75.00");
    app.sections = {};
    expect(applicationView(app)).toMatchObject({ totalCv: "", lcv: "" });
  });
  it("sums active split evaluations using each report or estimate", () => {
    const sections = {
      "evaluation-1": { estimatedValue: "200000", reportedValueTotal: "210000" },
      "evaluation-2": { estimatedValue: "90000" },
      "appraisal-split": true,
    };
    expect(collateralValue(sections)).toBe(300000);
    expect(collateralValue({ ...sections, "appraisal-split": false })).toBe(210000);
    expect(collateralValue({ ...sections, "evaluation-2": {} })).toBeNull();
  });
  it("does not produce invalid ratios or reuse sample values for missing inputs", () => {
    for (const invalid of ["", "garbage", "-100", "Infinity", "0"])
      expect(loanToCollateralValue(invalid, 200000)).toBe("");
    expect(loanToCollateralValue("100000", null)).toBe("");
    expect(loanToCollateralValue("100000", 0)).toBe("");
    expect(loanToCollateralValue("300000", 200000)).toBe("150.00");
    expect(loanToCollateralValue("100000", 300000)).toBe("33.33");
    expect(collateralValue({ "evaluation-1": { estimatedValue: "200000", reportedValueTotal: "0" } })).toBeNull();
    expect(collateralValue({ "evaluation-1": { estimatedValue: "200000", reportedValueTotal: "invalid" } })).toBeNull();
  });
});
