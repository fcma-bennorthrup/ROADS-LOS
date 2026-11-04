import { RICHARD_DATA, JANE_DATA } from "@/components/loan/BorrowerInformationContent";
import { SAMPLE_BORROWERS } from "@/components/loan/BorrowerFinancialsContent";
import { SAMPLE_CURRENT_ASSETS, SAMPLE_NON_CURRENT_ASSETS, SAMPLE_CURRENT_LIABILITIES, SAMPLE_NON_CURRENT_LIABILITIES } from "@/components/loan/BalanceSheetSection";
import { DEFAULT_ADDRESS } from "@/components/loan/CollateralContent";
import { emptyFields } from "@shared/loan-application";

export function tridDemoSections(loanId: string): Record<string, unknown> {
  const blend = blendDemoSections(loanId);
  return {
    "borrower-primary": { ...emptyFields(RICHARD_DATA), firstName: "Richard", lastName: "Jamerson", ssn: "XXX-XX-1234" },
    "loan-details": { ...emptyFields(blend["loan-details"] as Record<string, unknown>), requestedLoanAmount: "145000.00" },
    "subject-property": { ...emptyFields(blend["subject-property"] as Record<string, unknown>), address1: "125 Meadow Lane", city: "Louisville", state: "KY", zip: "40234" },
    "evaluation-1": { ...emptyFields(DEFAULT_ADDRESS), estimatedValue: "195000.00",
      evaluationDate: "", appraisalType: "", landValue: "", otherImprovementsValue: "", reportedValueTotal: "", appraiser: "" },
    income: [{ ...SAMPLE_BORROWERS[0], incomeSources: [{
      ...emptyFields(SAMPLE_BORROWERS[0].incomeSources[0]),
      id: "trid-demo-income", incomeType: "W2", baseEmploymentIncome: "60000.00",
      totalMonthlyIncome: "$5,000.00", totalYearlyIncome: "$60,000.00",
    }] }],
  };
}

// Reuse the prototype's synthetic form templates, captured as a complete snapshot
// on import rather than re-reading defaults after future code changes.
export function blendDemoSections(loanId: string): Record<string, unknown> {
  return {
    "borrower-primary": RICHARD_DATA,
    "borrower-secondary": JANE_DATA,
    "loan-details": {
      loanType: "purchase", loanPurpose: "primary_dwelling", requestedLoanAmount: "145000.00",
      downPaymentAmount: "$50,000.00", downPaymentSource: "cash_on_hand",
      tellTheStory: "Synthetic Blend application for prototype demos.", intentToProceed: false, brpLoan: false,
    },
    income: SAMPLE_BORROWERS.map((borrower, index) => ({ ...borrower, name: `${index === 0 ? "Richard" : "Jane"} Jamerson` })),
    "current-assets": SAMPLE_CURRENT_ASSETS,
    "noncurrent-assets": SAMPLE_NON_CURRENT_ASSETS,
    "current-liabilities": SAMPLE_CURRENT_LIABILITIES,
    "noncurrent-liabilities": SAMPLE_NON_CURRENT_LIABILITIES,
    "subject-property": { ...DEFAULT_ADDRESS, address1: "125 Meadow Lane", address2: "", collateralOwnerId: `${loanId}-primary` },
    fees: [],
  };
}
