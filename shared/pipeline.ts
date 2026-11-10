import { applicationView, type LoanApplication } from "./loan-application";
import type { LoanStage } from "./loan-stages";

export interface PipelineLoan {
  id: string;
  loanNumber: string;
  cifNumber?: string;
  additionalBorrowerCount?: number;
  region?: string;
  loanOfficer?: string;
  applicationDate?: string;
  departmentQueue?: "Sales Support";
  decision?: string;
  primaryBorrowerName: string;
  loanType: string;
  stage: LoanStage;
  amountRequested: number | null;
  product: string | null;
  mode: LoanApplication["mode"];
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export function pipelineView(document: LoanApplication): PipelineLoan {
  const view = applicationView(document);
  if (!document.meta) throw new Error("Loan metadata must be initialized before projection.");
  return {
    id: view.id, loanNumber: view.loanNumber, cifNumber: view.cifNumber,
    additionalBorrowerCount: Math.max(0, view.borrowers.length - 1),
    region: document.meta.opportunity?.region,
    loanOfficer: document.meta.opportunity?.loanOfficer,
    applicationDate: document.meta.opportunity?.applicationDate,
    departmentQueue: document.meta.opportunity?.queue,
    decision: document.meta.opportunity?.decision,
    primaryBorrowerName: view.primaryBorrowerName,
    loanType: view.loanType, stage: view.stage as LoanStage,
    amountRequested: view.summary.amountRequested, product: view.summary.product,
    mode: document.mode, revision: document.revision,
    createdAt: document.meta.createdAt, updatedAt: document.meta.updatedAt,
  };
}
