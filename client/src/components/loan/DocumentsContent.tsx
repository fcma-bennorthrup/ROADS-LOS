import { useState, useEffect, useRef } from "react";
import sampleClosingDisclosurePdf from "@assets/SampleCD_1776881551872.pdf";
import sampleClosingPackagePdf from "@assets/Redacted-ClosingPackage_Redacted_1776881993129.pdf";

type GenerationState = "idle" | "generating" | "generated";

function AnimatedEllipsis() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return <span>{".".repeat(dots)}</span>;
}

function formatTimestamp(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();
  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

interface SecondaryAction {
  label: string;
  onClick: () => void;
  testId?: string;
  marksDelivered?: boolean;
}

function DocumentSection({
  title,
  idleText,
  generatingText,
  generateLabel,
  secondaryLabel,
  onSecondaryClick,
  secondaryActions,
  testIdPrefix,
}: {
  title: string;
  idleText: string;
  generatingText: string;
  generateLabel: string;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  secondaryActions?: SecondaryAction[];
  testIdPrefix: string;
}) {
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [lastDelivered, setLastDelivered] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleGenerate = () => {
    setGenerationState("generating");
    timerRef.current = setTimeout(() => {
      setLastGenerated(formatTimestamp());
      setGenerationState("generated");
    }, 5000);
  };

  return (
    <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid={`text-${testIdPrefix}-title`}
      >
        {title}
      </h2>

      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <p
          className="body-100"
          style={{ color: "var(--roads-text-secondary)" }}
          data-testid={`text-${testIdPrefix}-status`}
        >
          {generationState === "idle" && idleText}
          {generationState === "generating" && (
            <span>
              {generatingText}<AnimatedEllipsis />
            </span>
          )}
          {generationState === "generated" && `Last Generated: ${lastGenerated}`}
        </p>

        {lastDelivered && (
          <p
            className="body-100"
            style={{ color: "var(--roads-text-secondary)" }}
            data-testid={`text-${testIdPrefix}-delivered`}
          >
            {`Marked Delivered: ${lastDelivered}`}
          </p>
        )}

        <div
          className="flex items-center"
          style={{ gap: "var(--roads-spacing-component-l)" }}
        >
          <button
            onClick={() => {
              if (generationState === "generating") return;
              handleGenerate();
            }}
            aria-disabled={generationState === "generating"}
            className="label-strong"
            style={{
              backgroundColor: "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              padding:
                "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: "none",
              cursor:
                generationState === "generating" ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
            data-testid={`button-generate-${testIdPrefix}`}
          >
            {generateLabel}
          </button>

          {(secondaryActions ??
            (secondaryLabel && onSecondaryClick
              ? [{ label: secondaryLabel, onClick: onSecondaryClick }]
              : [])
          ).map((action, index) => (
            <button
              key={`${testIdPrefix}-secondary-${index}`}
              onClick={() => {
                if (generationState !== "generated") return;
                action.onClick();
                if (action.marksDelivered) {
                  setLastDelivered(formatTimestamp());
                }
              }}
              aria-disabled={generationState !== "generated"}
              className="label-strong"
              style={{
                backgroundColor: "var(--roads-bg-primary)",
                color: "var(--roads-text-primary)",
                padding:
                  "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
                borderRadius: "var(--roads-radius-2xs)",
                border: "1px solid var(--roads-border-dark)",
                cursor:
                  generationState !== "generated" ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
              data-testid={
                action.testId ??
                (index === 0
                  ? `button-secondary-${testIdPrefix}`
                  : `button-secondary-${testIdPrefix}-${index}`)
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DisclosuresContent() {
  return (
    <div
      className="flex flex-col"
      style={{
        padding: "var(--roads-spacing-component-xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="disclosures-content"
    >
      <DocumentSection
        title="At-App Disclosures"
        idleText="No At-App Disclosures have been generated"
        generatingText="Generating At-App Disclosures"
        generateLabel="Generate At-App Disclosures"
        secondaryLabel="Download At-App Disclosures"
        onSecondaryClick={() => window.open("/at-app-disclosures.pdf", "_blank")}
        testIdPrefix="at-app-disclosures"
      />

      <DocumentSection
        title="Loan Estimate"
        idleText="No Loan Estimates have been generated"
        generatingText="Generating Loan Estimate"
        generateLabel="Generate Loan Estimate"
        secondaryLabel="View Loan Estimate"
        onSecondaryClick={() => window.open("/loan-estimate.pdf", "_blank")}
        testIdPrefix="loan-estimate"
      />
    </div>
  );
}

function ClosingDocumentsContent() {
  return (
    <div
      className="flex flex-col"
      style={{
        padding: "var(--roads-spacing-component-xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="closing-documents-content"
    >
      <DocumentSection
        title="Closing Disclosure"
        idleText="No Closing Disclosures have been generated"
        generatingText="Generating Closing Disclosure"
        generateLabel="Generate Closing Disclosure"
        secondaryActions={[
          {
            label: "View Closing Disclosure",
            onClick: () =>
              window.open(sampleClosingDisclosurePdf, "_blank", "noopener,noreferrer"),
          },
          {
            label: "Deliver Closing Disclosure",
            onClick: () => {},
            marksDelivered: true,
          },
        ]}
        testIdPrefix="closing-disclosure"
      />

      <DocumentSection
        title="Closing Package"
        idleText="No Closing Packages have been generated"
        generatingText="Generating Closing Package"
        generateLabel="Generate Closing Package"
        secondaryActions={[
          {
            label: "View Closing Package",
            onClick: () =>
              window.open(sampleClosingPackagePdf, "_blank", "noopener,noreferrer"),
          },
          {
            label: "Deliver Closing Package",
            onClick: () => {},
            marksDelivered: true,
          },
        ]}
        testIdPrefix="closing-package"
      />
    </div>
  );
}

const DOCUMENTS_NAV_ITEMS = [
  "Disclosures",
  "Closing Documents",
];

export function DocumentsContent() {
  return <DisclosuresContent />;
}

export { DOCUMENTS_NAV_ITEMS, ClosingDocumentsContent };
