import type { LoanApplication } from "./loan-application";
import { evaluateLoanRules } from "./business-rules";
import { LOAN_STAGES } from "./loan-stages";
import { LOAN_DOCUMENT_VERSION } from "./loan-contract";

export const BLANK_LOAN_TEMPLATE = {
  loanType: "", stage: LOAN_STAGES[0], primaryBorrowerName: "", product: "",
  applicationType: "", cifNumber: "", pweCbScore: 0, ruleOfXx: null,
  ecoaDaysRemaining: 0, tridDaysRemaining: 0,
  displayAmount: "0", amountRequested: "0", financedFees: "0", taxesInsurance: "0",
  finalRate: "0", principalInterest: "0", totalMonthlyPayment: "0", piti: "0", dti: "0",
  lcv: "0", totalCv: "0", cashReserves: "0", totalLoanAmount: "0", cashToClose: "0", apr: "0",
} as const;

export const IMPORTABLE_SECTIONS = [
  "borrower-primary", "borrower-secondary", "loan-details", "income",
  "current-assets", "noncurrent-assets", "current-liabilities", "noncurrent-liabilities",
  "subject-property", "fees",
];

export interface NewLoanInput {
  id: string;
  loanNumber: string;
  source: "blank" | "blend";
  borrowerCount: 1 | 2;
  sections?: Record<string, unknown>;
  generation?: number;
  revision?: number;
  now?: string;
}

export function newLoanApplication(input: NewLoanInput): LoanApplication {
  const blend = input.source === "blend";
  const loan = {
    ...BLANK_LOAN_TEMPLATE, id: input.id, loanNumber: input.loanNumber,
    loanType: blend ? "Purchase" : "",
    applicationType: blend && input.borrowerCount === 2 ? "Joint Credit Application" : "",
    amountRequested: blend ? "145000.00" : "0",
    displayAmount: blend ? "145000.00" : "0",
    totalLoanAmount: blend ? "145000.00" : "0",
    primaryBorrowerName: blend ? "Richard Jamerson" : "",
  };
  const borrowers = ["primary", "secondary"].slice(0, blend ? input.borrowerCount : 2).map((role, i) => ({
    id: `${loan.id}-${role}`, loanId: loan.id, isPrimary: i === 0,
    name: blend ? `${i === 0 ? "Richard" : "Jane"} Jamerson` : "",
    email: blend ? `${i === 0 ? "richard" : "jane"}.jamerson@example.com` : "",
    phone: blend ? `(502) 555-${i === 0 ? "0142" : "0188"}` : "",
  }));
  const sections = blend ? structuredClone(Object.fromEntries(
    Object.entries(input.sections ?? {}).filter(([key]) => IMPORTABLE_SECTIONS.includes(key)),
  )) : {};
  if (blend && input.borrowerCount === 1) {
    delete sections["borrower-secondary"];
    if (Array.isArray(sections.income)) sections.income = sections.income.slice(0, 1);
  }
  const now = input.now ?? new Date().toISOString();
  const next: LoanApplication = {
    schemaVersion: LOAN_DOCUMENT_VERSION,
    loan, borrowers, mode: blend ? "blend" : "empty", changeLog: [],
    generation: input.generation ?? 0, revision: input.revision ?? 0, sections,
    meta: { createdAt: now, updatedAt: now, source: input.source },
  };
  next.businessRules = evaluateLoanRules(next);
  return next;
}
