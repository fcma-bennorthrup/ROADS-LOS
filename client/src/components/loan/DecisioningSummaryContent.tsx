import { useState } from "react";

export function DecisioningSummaryContent() {
  const [isDecisioned, setIsDecisioned] = useState(false);
  const [letterGenerated, setLetterGenerated] = useState(false);
  const [creditPulled, setCreditPulled] = useState(false);

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) var(--roads-spacing-component-3xl)",
        gap: "var(--roads-spacing-component-l)",
      }}
      data-testid="decisioning-summary-content"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="heading-decisioning-summary"
      >
        Decisioning Summary
      </h2>
      <div
        className="flex"
        style={{ gap: "80px" }}
      >
      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-xs)", width: "345px" }}
      >
        <div
          className="headline-300 flex items-center"
          style={{
            gap: "var(--roads-spacing-component-xs)",
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
              backgroundColor: isDecisioned ? "var(--roads-bg-action-disabled)" : "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: "none",
              cursor: isDecisioned ? "not-allowed" : "pointer",
            }}
            data-testid="button-decision-loan"
          >
            Decision Loan
          </button>
          <button
            disabled={!isDecisioned}
            onClick={() => {
              if (!isDecisioned) return;
              if (letterGenerated) {
                window.open("/decision-letter.pdf", "_blank");
              } else {
                setLetterGenerated(true);
              }
            }}
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
            {letterGenerated ? "View Decision Letter" : "Generate Decision Letter"}
          </button>
        </div>
      </div>

      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-xs)" }}
      >
        <div
          className="headline-300 flex items-center whitespace-nowrap"
          style={{
            gap: "var(--roads-spacing-component-xs)",
            color: "var(--roads-text-primary)",
          }}
        >
          <span data-testid="text-credit-score-label">Credit Score:</span>
          <span data-testid="text-credit-score-value">{creditPulled ? "742" : "--"}</span>
        </div>
        <div className="flex items-center whitespace-nowrap" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <button
            onClick={() => setCreditPulled(true)}
            disabled={creditPulled}
            className="body-200-strong whitespace-nowrap"
            style={{
              backgroundColor: creditPulled ? "var(--roads-bg-action-disabled)" : "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: "none",
              cursor: creditPulled ? "not-allowed" : "pointer",
            }}
            data-testid="button-pull-credit"
          >
            Pull Credit
          </button>
          <button
            disabled={!creditPulled}
            onClick={() => { if (creditPulled) window.open("/credit-report.pdf", "_blank"); }}
            className="body-200-strong whitespace-nowrap"
            style={{
              backgroundColor: "var(--roads-bg-primary)",
              border: "1px solid var(--roads-border-dark)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              color: !creditPulled ? "var(--roads-text-tertiary)" : "var(--roads-text-primary)",
              cursor: !creditPulled ? "not-allowed" : "pointer",
              opacity: !creditPulled ? 0.6 : 1,
            }}
            data-testid="button-view-credit-report"
          >
            View Credit Report
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
