import { useEffect, useState } from "react";
import { useChecklist } from "@/contexts/checklist-context";
import { useActivityPanel } from "@/contexts/loan-activity-context";
import { formatActivityTimestamp } from "@/lib/loan-activity";
import { useToast } from "@/hooks/use-toast";

interface DecisioningSummaryContentProps {
  loanNumber?: string;
  borrowerName?: string;
}

export function DecisioningSummaryContent({
  loanNumber = "123456789",
  borrowerName = "Richard Jamerson",
}: DecisioningSummaryContentProps = {}) {
  const [isDecisioned, setIsDecisioned] = useState(false);
  const [letterGenerated, setLetterGenerated] = useState(false);
  const [creditPulled, setCreditPulled] = useState(false);
  const { setActionStatus, completeAction, getActionStatus, demoResetVersion } = useChecklist();
  const { addActivity } = useActivityPanel();
  const { toast } = useToast();

  useEffect(() => {
    setIsDecisioned(false);
    setLetterGenerated(false);
    setCreditPulled(false);
  }, [demoResetVersion]);

  const handlePullCredit = () => {
    setCreditPulled(true);
    if (getActionStatus("Loan Decision", 0) !== "complete") {
      setActionStatus("Loan Decision", 0, "in-progress");
    }
  };

  const handleDecisionLoan = () => {
    if (getActionStatus("Loan Decision", 0) === "complete") return;

    const decisionedAt = new Date();
    setIsDecisioned(true);
    setActionStatus("Loan Decision", 0, "complete");
    setActionStatus("Decision Letter", 0, "in-progress");
    addActivity({
      id: "loan-decision",
      title: "Loan Decision",
      description: "Loan is approved",
      timestamp: formatActivityTimestamp(decisionedAt),
      date: decisionedAt,
    });
    toast({
      variant: "information",
      title: "Loan Decision",
      description: `Loan ${loanNumber} | ${borrowerName} is approved.`,
      duration: 6000,
    });
  };

  const handleGenerateDecisionLetter = () => {
    setLetterGenerated(true);
    if (getActionStatus("Decision Letter", 0) === "complete") return;

    const generatedAt = new Date();
    completeAction("Decision Letter", 0);
    addActivity({
      id: "decision-letter-generated",
      title: "Document Generated",
      description: "Decision letter generated",
      timestamp: formatActivityTimestamp(generatedAt),
      date: generatedAt,
    });
  };

  const handleDeliverDecisionLetter = () => {
    if (!letterGenerated || getActionStatus("Decision Letter", 1) === "complete") return;

    const deliveredAt = new Date();
    setActionStatus("Decision Letter", 1, "complete");
    if (getActionStatus("Loan Estimate", 0) === "not-started") {
      setActionStatus("Loan Estimate", 0, "in-progress");
    }
    addActivity({
      id: "decision-letter-delivered",
      title: "Document Delivered",
      description: "Decision letter delivered",
      timestamp: formatActivityTimestamp(deliveredAt),
      date: deliveredAt,
    });
  };

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
            onClick={handleDecisionLoan}
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
            onClick={handleGenerateDecisionLetter}
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
          <button
            onClick={handleDeliverDecisionLetter}
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
            data-testid="button-deliver-decision-letter"
          >
            Deliver Decision Letter
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
            onClick={handlePullCredit}
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
