import type { LoanApplication } from "./loan-application";
import { evaluateLoanRules } from "./business-rules";
import { LOAN_STAGES } from "./loan-stages";
import { LOAN_DOCUMENT_VERSION } from "./loan-contract";
import { withOriginationFee } from "./business-rules/origination-fee";

export const BLANK_LOAN_TEMPLATE = {
  loanType: "", stage: LOAN_STAGES[0], primaryBorrowerName: "", product: "",
  applicationType: "", cifNumber: "", pweCbScore: 0, ruleOfXx: null,
  ecoaDaysRemaining: 0, tridDaysRemaining: 0,
  displayAmount: "0", amountRequested: "0", financedFees: "0", taxesInsurance: "0",
  finalRate: "0", principalInterest: "0", totalMonthlyPayment: "0", piti: "0", dti: "0",
  lcv: "0", totalCv: "0", cashReserves: "0", totalLoanAmount: "0", cashToClose: "0", apr: "0",
} as const;

export interface NewLoanInput {
  id: string;
  loanNumber: string;
  source: "blank";
  borrowerCount: 1 | 2;
  sections?: Record<string, unknown>;
  generation?: number;
  revision?: number;
  now?: string;
}

export function newLoanApplication(input: NewLoanInput): LoanApplication {
  const loan = {
    ...BLANK_LOAN_TEMPLATE, id: input.id, loanNumber: input.loanNumber,
  };
  const borrowers = ["primary", "secondary"].map((role, i) => ({
    id: `${loan.id}-${role}`, loanId: loan.id, isPrimary: i === 0,
    name: "", email: "", phone: "",
  }));
  const now = input.now ?? new Date().toISOString();
  const next: LoanApplication = {
    schemaVersion: LOAN_DOCUMENT_VERSION,
    loan, borrowers, mode: "empty", changeLog: [],
    generation: input.generation ?? 0, revision: input.revision ?? 0, sections: {},
    meta: { createdAt: now, updatedAt: now, source: input.source },
  };
  const initialized = withOriginationFee(next);
  initialized.businessRules = evaluateLoanRules(initialized);
  return initialized;
}
