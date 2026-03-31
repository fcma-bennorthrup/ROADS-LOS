import { useState } from "react";

export function DecisioningSummaryContent() {
  const [isDecisioned, setIsDecisioned] = useState(false);
  const [creditPulled, setCreditPulled] = useState(false);

  return (
    <div
      className="flex flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "80px",
      }}
      data-testid="decisioning-summary-content"
    >
      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-xs)", width: "345px" }}
      >
        <div
          className="flex items-center"
          style={{
            gap: "var(--roads-spacing-component-xs)",
            fontFamily: "var(--roads-font-family)",
            fontSize: "20px",
            fontWeight: 600,
            lineHeight: "24px",
            color: "var(--roads-text-primary)",
          }}
        >
          <span data-testid="text-loan-decision-label">Loan Decision:</span>
          <span data-testid="text-loan-decision-value">{isDecisioned ? "Loan Approved" : "--"}</span>
        </div>
        <div
          className="flex items-center"
          style={{ gap: "var(--roads-spacing-component-l)" }}
        >
          <button
            onClick={() => setIsDecisioned(true)}
            disabled={isDecisioned}
            className="body-200-strong"
            style={{
              backgroundColor: isDecisioned ? "var(--roads-bg-light)" : "var(--roads-bg-action)",
              color: isDecisioned ? "var(--roads-text-secondary)" : "var(--roads-text-reverse)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: isDecisioned ? "1px solid var(--roads-border-subtle)" : "none",
              cursor: isDecisioned ? "not-allowed" : "pointer",
              opacity: isDecisioned ? 0.6 : 1,
            }}
            data-testid="button-decision-loan"
          >
            Decision Loan
          </button>
          <button
            disabled={!isDecisioned}
            className="body-200-strong"
            style={{
              backgroundColor: "var(--roads-bg-primary)",
              border: "1px solid var(--roads-border-dark)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              color: !isDecisioned ? "var(--roads-text-tertiary)" : "var(--roads-text-primary)",
              cursor: !isDecisioned ? "not-allowed" : "pointer",
              opacity: !isDecisioned ? 0.6 : 1,
            }}
            data-testid="button-generate-decision-letter"
          >
            Generate Decision Letter
          </button>
        </div>
      </div>

      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-xs)", width: "180px" }}
      >
        <div
          className="flex items-center"
          style={{
            gap: "var(--roads-spacing-component-xs)",
            fontFamily: "var(--roads-font-family)",
            fontSize: "20px",
            fontWeight: 600,
            lineHeight: "24px",
            color: "var(--roads-text-primary)",
          }}
        >
          <span data-testid="text-credit-score-label">Credit Score:</span>
          <span data-testid="text-credit-score-value">{creditPulled ? "742" : "--"}</span>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => setCreditPulled(true)}
            disabled={creditPulled}
            className="body-200-strong"
            style={{
              backgroundColor: creditPulled ? "var(--roads-bg-light)" : "var(--roads-bg-action)",
              color: creditPulled ? "var(--roads-text-secondary)" : "var(--roads-text-reverse)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: creditPulled ? "1px solid var(--roads-border-subtle)" : "none",
              cursor: creditPulled ? "not-allowed" : "pointer",
              opacity: creditPulled ? 0.6 : 1,
            }}
            data-testid="button-pull-credit"
          >
            Pull Credit
          </button>
        </div>
      </div>
    </div>
  );
}
