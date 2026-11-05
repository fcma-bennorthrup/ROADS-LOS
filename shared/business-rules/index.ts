import type { LoanApplication } from "../loan-application";
import { evaluateTrid, type TridResult } from "./trid";
import { evaluateEcoa, type EcoaResult } from "./ecoa";
import { evaluateJointCredit } from "./joint-credit";
import { evaluateLoanDecision } from "./loan-decision";
import { evaluatePrimaryWageEarner } from "./primary-wage-earner";

export interface LoanBusinessRules {
  trid: TridResult;
  ecoa: EcoaResult;
  jointCredit: ReturnType<typeof evaluateJointCredit>;
  loanDecision: ReturnType<typeof evaluateLoanDecision>;
  primaryWageEarner: ReturnType<typeof evaluatePrimaryWageEarner>;
}

/** Small typed registry, not a configurable rules engine.
 * Rules inspect saved snapshots; no UI dependencies, network calls or side effects.
 */
export function evaluateLoanRules(app: LoanApplication, now = new Date().toISOString()): LoanBusinessRules {
  return { trid: evaluateTrid(app, now), ecoa: evaluateEcoa(app, now), jointCredit: evaluateJointCredit(app), loanDecision: evaluateLoanDecision(app), primaryWageEarner: evaluatePrimaryWageEarner(app) };
}
