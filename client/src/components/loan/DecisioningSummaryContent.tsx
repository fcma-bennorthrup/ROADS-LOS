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
        style={{ gap: "var(--roads-spacing-component-xs)" }}
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
            className="body-200-strong whitespace-nowrap"
            style={{
              backgroundColor: "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: "none",
              cursor: "pointer",
            }}
            data-testid="button-decision-loan"
          >
            Decision Loan
          </button>
          <button
            onClick={() => setLetterGenerated(true)}
            className="body-200-strong whitespace-nowrap"
            style={{
              backgroundColor: "var(--roads-bg-primary)",
              border: "1px solid var(--roads-border-dark)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              color: "var(--roads-text-primary)",
              cursor: "pointer",
            }}
            data-testid="button-generate-decision-letter"
          >
            Generate Decision Letter
          </button>
          <button
            onClick={() => {
              if (!letterGenerated) return;
              window.open("/decision-letter.pdf", "_blank");
            }}
            aria-disabled={!letterGenerated}
            className="body-200-strong whitespace-nowrap"
            style={{
              backgroundColor: "var(--roads-bg-primary)",
              border: "1px solid var(--roads-border-dark)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              color: "var(--roads-text-primary)",
              cursor: letterGenerated ? "pointer" : "not-allowed",
            }}
            data-testid="button-view-decision-letter"
          >
            View Decision Letter
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
        </div>
      </div>
      </div>
    </div>
  );
}
