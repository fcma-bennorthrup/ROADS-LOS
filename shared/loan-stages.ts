export const LOAN_STAGES = [
  "Customer Application", "Pre-Approval", "Loan Setup", "Decisioning",
  "Loan Finalization", "Closing", "Booking", "Loan Certification",
] as const;
export type LoanStage = typeof LOAN_STAGES[number];
