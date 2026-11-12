import type { ReactNode } from "react";
import { FiEye, FiUserPlus } from "react-icons/fi";
import type { PipelineLoan } from "@shared/pipeline";
import type { PipelineQueue, PipelineSort } from "@/lib/pipeline-display";
import { formatCurrency } from "@/lib/loan-display";
import { LoanTeamDialog } from "@/components/LoanTeamDialog";
import { WithdrawLoanAction } from "@/components/WithdrawLoanAction";
import { PipelineTridChip } from "@/components/PipelineTridChip";

type PipelineColumn = {
  key: string;
  sort?: PipelineSort;
  label: string;
  width: number;
  render: (loan: PipelineLoan, showTeam?: boolean, queue?: PipelineQueue) => ReactNode;
};

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function Unavailable({ field }: { field: string }) {
  const explanation = `${field} is not available in the saved pipeline data.`;
  return <span title={explanation} aria-label={explanation}>—</span>;
}

const columns = {
  loanNumber: { key: "loanNumber", sort: "loanNumber", label: "Loan Number", width: 125, render: loan =>
    <span className="body-200-strong">{loan.loanNumber}</span> },
  cifNumber: { key: "cifNumber", sort: "cifNumber", label: "CIF", width: 80, render: loan => loan.cifNumber || <Unavailable field="CIF" /> },
  region: { key: "region", label: "Region", width: 80, render: loan => loan.region ?? <Unavailable field="Region" /> },
  primaryBorrowerName: { key: "primaryBorrowerName", sort: "primaryBorrowerName", label: "Borrower Name", width: 278, render: loan =>
    <>{loan.primaryBorrowerName || <Unavailable field="Borrower name" />}{!!loan.additionalBorrowerCount && <span className="pipeline-additional caption-100" aria-label={`${loan.additionalBorrowerCount} additional borrowers`}>+{loan.additionalBorrowerCount}</span>}</> },
  loanType: { key: "loanType", sort: "loanType", label: "Loan Purpose", width: 230, render: loan => loan.loanType || <Unavailable field="Loan purpose" /> },
  amountRequested: { key: "amountRequested", sort: "amountRequested", label: "Req Amount", width: 242, render: loan => loan.amountRequested === null ? <Unavailable field="Requested amount" /> : formatCurrency(String(loan.amountRequested)) },
  stage: { key: "stage", sort: "stage", label: "Stage", width: 230, render: loan => loan.withdrawn ? "Withdrawn" : loan.stage },
  officer: { key: "officer", label: "LO", width: 160, render: loan => loan.loanOfficer ?? <Unavailable field="Loan officer" /> },
  applicationDate: { key: "applicationDate", label: "App Start Date", width: 151, render: loan => loan.applicationDate ? displayDate(loan.applicationDate) : <Unavailable field="Application start date" /> },
  submitDate: { key: "submitDate", label: "App Submit Date", width: 151, render: () => <Unavailable field="Application submit date" /> },
  contractExpiryDate: { key: "contractExpiryDate", label: "Contract Exp Date", width: 151, render: loan => loan.contractExpiryDate ? displayDate(loan.contractExpiryDate) : <Unavailable field="Contract expiry date" /> },
  decision: { key: "decision", label: "Decision", width: 112, render: loan => loan.decision ?? <Unavailable field="Decision" /> },
  closingDate: { key: "closingDate", label: "Closing Date", width: 130, render: loan => loan.closingDate || null },
  trid: { key: "trid", label: "TRID", width: 85, render: loan => <PipelineTridChip loan={loan} /> },
  // These columns have no approved field semantics. Keep them blank, not inferred.
  appraisal: { key: "appraisal", label: "Appraisal", width: 100, render: () => null },
  titleWork: { key: "titleWork", label: "Title Work", width: 100, render: () => null },
  actions: { key: "actions", label: "Actions", width: 104, render: (loan, showTeam, queue) =>
    <div className="pipeline-row-actions">
      {showTeam ? <LoanTeamDialog loanNumber={loan.loanNumber} loanOfficer={loan.loanOfficer} /> : <button className={queue === "Operations" ? "pipeline-operations-assignment" : undefined} disabled aria-label={`Assign loan ${loan.loanNumber} — unavailable`} title="Loan assignment is not available"><FiUserPlus aria-hidden /></button>}
      <button disabled aria-label={`Preview loan ${loan.loanNumber} — unavailable`} title="Loan preview is not available yet"><FiEye aria-hidden /></button>
      <WithdrawLoanAction loan={loan} />
    </div> },
} satisfies Record<string, PipelineColumn>;

const allColumns: readonly PipelineColumn[] = [
  columns.loanNumber, columns.cifNumber, columns.region, columns.primaryBorrowerName,
  columns.loanType, columns.amountRequested, columns.stage, columns.officer,
  columns.applicationDate, columns.decision, columns.actions,
];
const salesColumns: readonly PipelineColumn[] = [
  columns.loanNumber, columns.cifNumber, columns.region, columns.primaryBorrowerName,
  { ...columns.loanType, width: 150 }, { ...columns.amountRequested, width: 130 },
  { ...columns.stage, width: 180 }, columns.officer, columns.submitDate,
  columns.contractExpiryDate, columns.decision, columns.appraisal, columns.actions,
];
const operationsColumns: readonly PipelineColumn[] = [
  columns.loanNumber, columns.cifNumber, columns.region, columns.primaryBorrowerName,
  { ...columns.loanType, width: 150 }, { ...columns.stage, width: 180 }, columns.officer,
  columns.closingDate, columns.contractExpiryDate, columns.trid, columns.decision,
  columns.appraisal, columns.titleWork, columns.actions,
];

const queueColumns: Record<PipelineQueue, readonly PipelineColumn[]> = {
  "All Loans": allColumns,
  "Sales Support": salesColumns,
  Operations: operationsColumns,
};

export function getPipelineColumns(queue: PipelineQueue) {
  return queueColumns[queue];
}

export function PipelineRowCells({ columns, loan, showTeam = false, queue }: { columns: readonly PipelineColumn[]; loan: PipelineLoan; showTeam?: boolean; queue?: PipelineQueue }) {
  return <>{columns.map(column => <td key={column.key}>{column.render(loan, showTeam, queue)}</td>)}</>;
}
