import "./LoanContentLayout.css";
import { useEffect, useRef, useState } from "react";
import { useLoanState, useApplicationStatus } from "@/contexts/loan-application-context";
import { useChecklist } from "@/contexts/checklist-context";
import { useActivityPanel } from "@/contexts/loan-activity-context";
import { formatActivityTimestamp } from "@/lib/loan-activity";
import { useToast } from "@/hooks/use-toast";
import { applicationRequest, applicationStore } from "@/lib/loan-application-store";
import { loanDecisionActionStatus } from "@shared/business-rules/loan-decision";
import { simulateLoanDecision, type DecisionOutcome } from "@shared/business-rules/decision-simulation";
import { applicationView } from "@shared/loan-application";
import { evaluatePrimaryWageEarner } from "@shared/business-rules/primary-wage-earner";
import { randomDemoCreditScore } from "@shared/demo-credit";

interface DecisioningSummaryContentProps {
  loanNumber?: string;
  borrowerName?: string;
}

export function DecisioningSummaryContent({
  loanNumber = "123456789",
  borrowerName = "Richard Jamerson",
}: DecisioningSummaryContentProps = {}) {
  const { setActionStatus, completeAction, getActionStatus, demoResetVersion } = useChecklist();
  // Restore only completed workflow actions. Credit has no persisted authority.
  // Keep these local after mount: action-order and reset behavior are unchanged.
  const [isDecisioned, setIsDecisioned] = useState(() => getActionStatus("Loan Decision", 0) === "complete");
  const [letterGenerated, setLetterGenerated] = useState(() => getActionStatus("Decision Letter", 0) === "complete");
  const [creditPulled, setCreditPulled] = useLoanState("credit-pulled", false, false, false);
  const [decisionOutcome, setDecisionOutcome] = useLoanState<DecisionOutcome | null>("decision-outcome", null, null, false);
  const app = useApplicationStatus().document;
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  const primaryWageEarnerId = app ? evaluatePrimaryWageEarner(app).borrowerId : null;
  const borrowers = app ? [...applicationView(app).borrowers].sort((a, b) =>
    Number(b.id === primaryWageEarnerId) - Number(a.id === primaryWageEarnerId))
    : [{ id: "preview", name: borrowerName }];
  const scores = app?.sections["credit-scores"] as Record<string, number> | undefined;
  const observedResetVersion = useRef(demoResetVersion);
  const { addActivity } = useActivityPanel();
  const { toast } = useToast();
  const [pullingCredit, setPullingCredit] = useState(false);
  const creditRequestInFlight = useRef(false);

  useEffect(() => {
    if (observedResetVersion.current === demoResetVersion) return;
    observedResetVersion.current = demoResetVersion;
    setIsDecisioned(false);
    setLetterGenerated(false);
    setCreditPulled(false);
  }, [demoResetVersion]);

  const handlePullCredit = async () => {
    if (creditRequestInFlight.current) return;
    creditRequestInFlight.current = true;
    setPullingCredit(true);
    try {
      if (applicationStore.document) {
        await applicationStore.flush();
        if (applicationStore.dirty) throw new Error("Save or discard open edits before pulling credit.");
        const current = applicationStore.document;
        const next = await applicationRequest(current.loan.id, "/credit", {
          method: "POST",
          body: JSON.stringify({ generation: current.generation, revision: current.revision }),
        });
        applicationStore.install(next);
      }
      setCreditPulled(true);
      // Standalone component previews have no saved document/provider rule result.
      // The application checklist consumes the acknowledged business rule instead.
      if (!applicationStore.document) {
        setPreviewScore(randomDemoCreditScore());
        setActionStatus("Loan Decision", 0,
          loanDecisionActionStatus(true, getActionStatus("Loan Decision", 0)) as "complete" | "in-progress");
      }
    } catch (error) {
      const frozen = (error as Error & { code?: string }).code === "CREDIT_FROZEN";
      toast({ variant: frozen ? "error" : "destructive", title: frozen ? "Credit is frozen" : "Credit pull failed",
        description: (error as Error).message, ...(frozen ? { persistent: true } : {}) });
    } finally {
      creditRequestInFlight.current = false;
      setPullingCredit(false);
    }
  };

  const handleDecisionLoan = () => {
    if (getActionStatus("Loan Decision", 0) === "complete") return;

    const outcome = simulateLoanDecision(applicationStore.document);
    try {
      setDecisionOutcome(outcome);
    } catch (error) {
      toast({ variant: "destructive", title: "Decision failed", description: (error as Error).message });
      return;
    }
    const decisionedAt = new Date();
    setIsDecisioned(true);
    setActionStatus("Loan Decision", 0, "complete");
    setActionStatus("Decision Letter", 0, "in-progress");
    addActivity({
      id: "loan-decision",
      title: "Loan Decision",
      description: `Loan is ${outcome}`,
      timestamp: formatActivityTimestamp(decisionedAt),
      date: decisionedAt,
    });
    toast({
      variant: "information",
      title: "Loan Decision",
      description: `Loan ${loanNumber} | ${borrowerName} is ${outcome}.`,
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
    toast({
      variant: "success",
      title: "Decision letter generated.",
      duration: 5000,
    });
  };

  const handleDeliverDecisionLetter = () => {
    if (!letterGenerated || getActionStatus("Decision Letter", 1) === "complete") return;

    const deliveredAt = new Date();
    setActionStatus("Decision Letter", 1, "complete");
    addActivity({
      id: "decision-letter-delivered",
      title: "Document Delivered",
      description: "Decision letter delivered",
      timestamp: formatActivityTimestamp(deliveredAt),
      date: deliveredAt,
    });
    toast({
      variant: "success",
      title: "Decision letter delivered.",
      duration: 5000,
    });
  };

  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl)",
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
        className="loan-layout-subhead flex flex-col"
        style={{ gap: "var(--roads-spacing-component-xl)" }}
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
          <span data-testid="text-loan-decision-value">{isDecisioned ? (decisionOutcome === "denied" ? "Loan Denied" : "Loan Approved") : "--"}</span>
        </div>
        <div
          className="loan-layout-section-content flex items-center"
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
              // PDF previews retired; retain the prototype control and its enabled state.
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
            gap: "var(--roads-spacing-component-l)",
            color: "var(--roads-text-primary)",
          }}
        >
          <span data-testid="text-credit-score-label">Credit Score:</span>
          <button
            onClick={handlePullCredit}
            disabled={pullingCredit}
            className="body-200-strong whitespace-nowrap"
            style={{
              backgroundColor: pullingCredit ? "var(--roads-bg-action-disabled)" : "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: "none",
              cursor: pullingCredit ? "not-allowed" : "pointer",
            }}
            data-testid="button-pull-credit"
          >
            {pullingCredit ? "Pulling Credit…" : "Pull Credit"}
          </button>
        </div>
        <dl className="loan-layout-section-content flex flex-col body-100" style={{ gap: "var(--roads-spacing-component-l)", color: "var(--roads-text-primary)" }}>
          {borrowers.map(borrower => (
            <div key={borrower.id} className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }} data-testid="borrower-credit-score">
              <dt>{borrower.name}:</dt>
              <dd data-testid="text-credit-score-value">{creditPulled ? (app ? scores?.[borrower.id] ?? "--" : previewScore ?? "--") : "--"}</dd>
            </div>
          ))}
        </dl>
      </div>
      </div>
    </div>
  );
}
