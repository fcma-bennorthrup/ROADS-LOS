import type { LoanApplication } from "./loan-application";

export interface SummaryCash {
  cashReserves: number | null;
  cashToClose: number | null;
  pweCbScore: number | null;
  ruleOfXx: string | null;
  missing: string[];
}

/**
 * These Summary outputs are not yet derivable from the saved application.
 *
 * BalanceSheetSection saves cashOrMarketValue, not verified funds available
 * after closing. FeesContent saves LE/CD amounts and payment labels; neither
 * it nor closing-details provides a complete settlement reconciliation.
 * populateDemoCredit saves synthetic liabilities and a credit-pulled flag,
 * not a bureau score. The loan-level outputs originate in seedData (or demo
 * reset values), with no calculation/source provenance. Do not reuse them.
 *
 * Keep unsupported values explicit until their inputs and policies are defined.
 * In particular, an asset total is not post-closing cash reserves.
 */
export function calculateSummaryCash(_app: LoanApplication): SummaryCash {
  return {
    cashReserves: null,
    cashToClose: null,
    pweCbScore: null,
    ruleOfXx: null,
    missing: [
      "Cash Reserves: no defined reserve calculation or verified post-closing funds source; saved asset cash/market values alone are not cash reserves.",
      "Cash to Close: no complete saved settlement reconciliation or calculation policy for down payment, fees, prepaids/escrows, deposits, credits and payoffs; closing details only supply a date and review status.",
      "PWE CB Score: no sourced credit bureau score or PWE selection policy; the saved credit-pulled flag and synthetic liabilities do not supply a score, and hardcoded sample scores are not credit results.",
      "Rule of XX: no defined formula, policy or authoritative saved result source.",
    ],
  };
}
