import type { LoanApplication } from "../loan-application";
import { evaluateTrid, type TridResult } from "./trid";
import { evaluateEcoa, type EcoaResult } from "./ecoa";

export interface LoanBusinessRules {
  trid: TridResult;
  ecoa: EcoaResult;
}

/** Small typed registry, not a configurable rules engine.
 * Rules inspect saved snapshots; no UI dependencies, network calls or side effects.
 */
export function evaluateLoanRules(app: LoanApplication, now = new Date().toISOString()): LoanBusinessRules {
  return { trid: evaluateTrid(app, now), ecoa: evaluateEcoa(app, now) };
}
