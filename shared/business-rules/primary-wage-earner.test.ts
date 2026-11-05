import { expect, it } from "vitest";
import type { LoanApplication } from "../loan-application";
import { evaluateLoanRules } from "./index";
import { incomeSourceTotals } from "./primary-wage-earner";
import { populateDemoCredit } from "../demo-credit";
import { calculateSummary } from "../summary";
import { resetChecklistData } from "../reset-checklist-data";

function app(): LoanApplication {
  return { loan: { id: "pwe" }, borrowers: [{ id: "a", name: "First" }, { id: "b", name: "Second" }],
    generation: 1, revision: 1, sections: { income: [
      { incomeSources: [{ baseEmploymentIncome: "72000", totalMonthlyIncome: "1" }] },
      { incomeSources: [{ baseEmploymentIncome: "48000" }, { bonuses: "12000" }] },
    ] } } as unknown as LoanApplication;
}
it("recomputes income, moves PWE and selects that borrower's saved score", () => {
  let loan = app();
  expect(evaluateLoanRules(loan).primaryWageEarner.borrowerId).toBe("a");
  expect(calculateSummary(loan).pweCbScore).toBeNull();
  loan = populateDemoCredit(loan);
  expect(calculateSummary(loan).pweCbScore).toBe(742);
  (loan.sections.income as any[])[1].incomeSources[0].baseEmploymentIncome = "96000";
  expect(evaluateLoanRules(loan).primaryWageEarner.borrowerId).toBe("b");
  expect(calculateSummary(JSON.parse(JSON.stringify(loan))).pweCbScore).toBe(718);
  const reset = resetChecklistData(loan);
  expect(calculateSummary(reset).pweCbScore).toBeNull();
  expect(evaluateLoanRules(reset).primaryWageEarner.borrowerId).toBe("b");
  expect(reset.sections["credit-scores"]).toBeUndefined();
});
it("handles one borrower, ties, missing and invalid income", () => {
  const loan = app();
  loan.sections.income = [{ incomeSources: [{ totalMonthlyIncome: "5000" }] }, { incomeSources: [{ totalMonthlyIncome: "5000" }] }];
  expect(evaluateLoanRules(loan).primaryWageEarner.borrowerId).toBe("a");
  (loan.sections.income as any[])[1].incomeSources = [];
  expect(evaluateLoanRules(loan).primaryWageEarner.borrowerId).toBeNull();
  loan.borrowers = loan.borrowers.slice(0, 1);
  expect(evaluateLoanRules(loan).primaryWageEarner.borrowerId).toBe("a");
  expect(incomeSourceTotals({ baseEmploymentIncome: "$60,000", bonuses: "12000" })).toEqual({ yearly: 72000, monthly: 6000 });
  expect(incomeSourceTotals({ baseEmploymentIncome: "invalid", totalMonthlyIncome: "5000" })).toBeNull();
});
