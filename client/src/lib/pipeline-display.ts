import type { PipelineLoan } from "@shared/pipeline";
import { LOAN_STAGES, type LoanStage } from "@shared/loan-stages";

export type PipelineSort = "loanNumber" | "cifNumber" | "primaryBorrowerName" | "loanType" | "stage" | "amountRequested" | "product" | "updatedAt";
export const PIPELINE_QUEUES = ["All Loans", "Sales Support", "Operations", "Credit", "Quality Control"] as const;
export type PipelineQueue = typeof PIPELINE_QUEUES[number];
export type DepartmentQueue = Exclude<PipelineQueue, "All Loans">;
// Only explicitly saved assignments determine department membership, never stages.
export function queueLoans(rows: PipelineLoan[], queue: PipelineQueue,
  assignment: (loan: PipelineLoan) => DepartmentQueue | undefined = loan => loan.departmentQueue) {
  // Operations columns are presentation-only until assignment rules are approved.
  if (queue === "Operations") return [];
  return queue === "All Loans" ? rows : rows.filter(loan => assignment(loan) === queue);
}
export function pipelinePage<T>(rows: T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.max(1, Math.min(requestedPage, pageCount));
  return { page, pageCount, rows: rows.slice((page - 1) * pageSize, page * pageSize) };
}
export function pipelineRows(rows: PipelineLoan[], search: string, stages: readonly LoanStage[], sort: PipelineSort, direction: "asc" | "desc") {
  const term = search.trim().toLocaleLowerCase();
  return rows.filter(row => (!stages.length || stages.includes(row.stage)) &&
    (!term || row.loanNumber.toLocaleLowerCase().includes(term) || row.primaryBorrowerName.toLocaleLowerCase().includes(term) ||
      row.cifNumber?.toLocaleLowerCase().includes(term)))
    .sort((a, b) => {
      const left = a[sort], right = b[sort];
      if (left == null || left === "") return right == null || right === "" ? a.id.localeCompare(b.id) : 1;
      if (right == null || right === "") return -1;
      const result = sort === "stage" ? LOAN_STAGES.indexOf(a.stage) - LOAN_STAGES.indexOf(b.stage)
        : sort === "amountRequested" ? a.amountRequested! - b.amountRequested!
        : sort === "updatedAt" ? Date.parse(a.updatedAt) - Date.parse(b.updatedAt)
        : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
      return (direction === "asc" ? result : -result) || a.id.localeCompare(b.id);
    });
}

export function relativeUpdated(value: string, now = Date.now()) {
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return "—";
  const seconds = Math.max(0, Math.floor((now - date) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  const days = Math.floor(seconds / 86400);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
