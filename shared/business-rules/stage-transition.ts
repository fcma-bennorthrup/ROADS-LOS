import type { LoanApplication } from "../loan-application";

/** Event-driven rule: persist the transition in the same write as the import. */
export function stageAfterBlendImport(stage: LoanApplication["loan"]["stage"]) {
  return stage === "Customer Application" ? "Decisioning" : stage;
}
