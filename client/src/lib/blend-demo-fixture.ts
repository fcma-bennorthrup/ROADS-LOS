import { RICHARD_DATA, JANE_DATA } from "@/components/loan/BorrowerInformationContent";
import { SAMPLE_BORROWERS } from "@/components/loan/BorrowerFinancialsContent";
import { SAMPLE_CURRENT_ASSETS, SAMPLE_NON_CURRENT_ASSETS, SAMPLE_CURRENT_LIABILITIES, SAMPLE_NON_CURRENT_LIABILITIES } from "@/components/loan/BalanceSheetSection";
import { DEFAULT_ADDRESS } from "@/components/loan/CollateralContent";

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
