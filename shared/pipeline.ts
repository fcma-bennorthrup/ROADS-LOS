import { applicationView, type LoanApplication } from "./loan-application";
import type { LoanStage } from "./loan-stages";
import { operationsTeamSchema, type OperationsTeam } from "./operations-team";

export interface PipelineLoan {
  id: string;
  loanNumber: string;
  cifNumber?: string;
  additionalBorrowerCount?: number;
  region?: string;
  loanOfficer?: string;
  applicationDate?: string;
  contractExpiryDate?: string;
  departmentQueue?: "Sales Support";
  operationsEligible?: boolean;
  operationsTeam?: OperationsTeam;
  closingDate?: string;
  tridTriggeredAt?: string | null;
  tridStatus?: "not-triggered" | "required" | "satisfied";
  decision?: string;
  primaryBorrowerName: string;
  loanType: string;
  stage: LoanStage;
  withdrawn?: boolean;
  amountRequested: number | null;
  product: string | null;
  mode: LoanApplication["mode"];
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export function pipelineView(document: LoanApplication): PipelineLoan {
  const view = applicationView(document);
  const team = operationsTeamSchema.safeParse(document.sections["operations-team"]);
  const closing = document.sections["closing-details"] as { closingDate?: unknown } | undefined;
  if (!document.meta) throw new Error("Loan metadata must be initialized before projection.");
  return {
    id: view.id, loanNumber: view.loanNumber, cifNumber: view.cifNumber,
    additionalBorrowerCount: Math.max(0, view.borrowers.length - 1),
    region: document.meta.opportunity?.region,
    loanOfficer: document.meta.opportunity?.loanOfficer,
    applicationDate: document.meta.opportunity?.applicationDate,
    contractExpiryDate: document.meta.opportunity?.contractExpiryDate,
    departmentQueue: document.meta.opportunity?.queue,
    operationsEligible: Boolean(document.businessRules?.trid.triggeredAt),
    operationsTeam: team.success ? team.data : undefined,
    closingDate: typeof closing?.closingDate === "string" ? closing.closingDate : undefined,
    tridTriggeredAt: document.businessRules?.trid.triggeredAt,
    tridStatus: document.businessRules?.trid.status,
    decision: document.meta.opportunity?.decision,
    primaryBorrowerName: view.primaryBorrowerName,
    loanType: view.loanType, stage: view.stage as LoanStage,
    withdrawn: (document.sections.withdrawal as { acknowledged?: boolean } | undefined)?.acknowledged === true,
    amountRequested: view.summary.amountRequested, product: view.summary.product,
    mode: document.mode, revision: document.revision,
    createdAt: document.meta.createdAt, updatedAt: document.meta.updatedAt,
  };
}
