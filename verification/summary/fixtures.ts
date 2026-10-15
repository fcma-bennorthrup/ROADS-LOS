import type { Loan, Borrower } from "../../shared/schema";

export const borrowers: Borrower[] = [
  { id: "second", loanId: "synthetic", name: "Synthetic Beta", email: "beta@example.invalid", phone: "202-555-0102", isPrimary: false },
  { id: "first", loanId: "synthetic", name: "Synthetic Alpha", email: "alpha@example.invalid", phone: "202-555-0101", isPrimary: true },
];

export const loan: Loan & { borrowers: Borrower[] } = {
  id: "synthetic", loanNumber: "TEST-42", cifNumber: "CIF-TEST",
  loanType: "Synthetic Construction", stage: "Booking",
  primaryBorrowerName: "Synthetic Alpha", displayAmount: "111.11",
  amountRequested: "222.22", totalLoanAmount: "333.33",
  financedFees: "4.50", taxesInsurance: "5.60", product: "Fixture Product",
  finalRate: "6.700", principalInterest: "7.80", totalMonthlyPayment: "9.10",
  applicationType: "Joint Credit Application", ecoaDaysRemaining: 14,
  tridDaysRemaining: 3, piti: "10.00", dti: "20.50", lcv: "30.000",
  pweCbScore: 742, ruleOfXx: null, totalCv: "1234.56", cashReserves: "8765.43",
  cashToClose: "11.12", apr: "8.900", borrowers,
};

// Literal expectations, not generated using production formatting/mapping.
export const rows = [
  ["piti", "PITI", "10.00%"], ["dti", "DTI", "20.50%"],
  ["lcv", "L/CV", "30.000%"], ["pwe-cb-score", "PWE CB Score", "742"],
  ["rule-of-xx", "Rule of XX", "--"], ["total-cv", "Total CV", "$1,234.56"],
  ["cash-reserves", "Cash Reserves", "$8,765.43"],
  ["total-loan-amount", "Total Loan Amount", "$333.33"],
  ["amount-requested", "Amount Requested", "$222.22"],
  ["financed-fees", "Financed Fees", "$4.50"],
  ["taxes-insurance", "Taxes & Insurance", "$5.60"],
  ["cash-to-close", "Cash to Close", "$11.12"],
  ["product", "Product", "Fixture Product"], ["final-rate", "Final Rate", "6.700%"],
  ["apr", "APR", "8.900%"], ["principal-interest", "Principal & Interest", "$7.80"],
  ["total-monthly-payment", "Total Monthly Payment", "$9.10"],
] as const;
