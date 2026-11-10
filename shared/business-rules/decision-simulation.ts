import type { LoanApplication } from "../loan-application";

export const DECISION_MODES = ["force-approval", "force-denial", "real-ede"] as const;
export type DecisionMode = typeof DECISION_MODES[number];
export type DecisionOutcome = "approved" | "denied";

export function decisionMode(app: LoanApplication | null | undefined): DecisionMode {
  const value = app?.sections["decision-mode"];
  return DECISION_MODES.includes(value as DecisionMode) ? value as DecisionMode : "force-approval";
}

/** Add the prototype's EDE outcome rules here once their criteria are defined. */
export function evaluateEdeDecision(_app: LoanApplication | null | undefined): DecisionOutcome | null {
  return null;
}

export function simulateLoanDecision(app: LoanApplication | null | undefined): DecisionOutcome | null {
  switch (decisionMode(app)) {
    case "force-approval": return "approved";
    case "force-denial": return "denied";
    case "real-ede": return evaluateEdeDecision(app);
  }
}
