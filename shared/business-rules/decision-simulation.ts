import type { LoanApplication } from "../loan-application";

export const DECISION_MODES = ["force-approval", "force-denial"] as const;
export type DecisionMode = typeof DECISION_MODES[number];
export type DecisionOutcome = "approved" | "denied";

export function decisionMode(app: LoanApplication | null | undefined): DecisionMode {
  const value = app?.sections["decision-mode"];
  return DECISION_MODES.includes(value as DecisionMode) ? value as DecisionMode : "force-approval";
}

export function simulateLoanDecision(app: LoanApplication | null | undefined): DecisionOutcome {
  switch (decisionMode(app)) {
    case "force-approval": return "approved";
    case "force-denial": return "denied";
  }
}
