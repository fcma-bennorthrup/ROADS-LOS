import type { LoanApplication } from "../loan-application";
import { evaluateTrid, type TridResult } from "./trid";

export interface LoanBusinessRules {
  trid: TridResult;
}

/** Small typed registry, not a configurable rules engine.
 * Rules inspect saved snapshots; no UI dependencies, network calls or side effects.
 */
export function evaluateLoanRules(app: LoanApplication, now = new Date().toISOString()): LoanBusinessRules {
  return { trid: evaluateTrid(app, now) };
}
