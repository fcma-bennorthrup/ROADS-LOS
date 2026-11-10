import type { PipelineLoan } from "@shared/pipeline";
import { LOAN_STAGES, type LoanStage } from "@shared/loan-stages";

export type PipelineSort = "loanNumber" | "primaryBorrowerName" | "loanType" | "stage" | "amountRequested" | "product" | "updatedAt";
export function pipelineRows(rows: PipelineLoan[], search: string, stages: readonly LoanStage[], sort: PipelineSort, direction: "asc" | "desc") {
  const term = search.trim().toLocaleLowerCase();
  return rows.filter(row => (!stages.length || stages.includes(row.stage)) &&
    (!term || row.loanNumber.toLocaleLowerCase().includes(term) || row.primaryBorrowerName.toLocaleLowerCase().includes(term)))
    .sort((a, b) => {
      const left = a[sort], right = b[sort];
      if (left === null || left === "") return right === null || right === "" ? 0 : 1;
      if (right === null || right === "") return -1;
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
