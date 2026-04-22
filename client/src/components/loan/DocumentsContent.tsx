import { useState, useEffect, useRef } from "react";

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

function DocumentSection({
  title,
  idleText,
  generatingText,
  generateLabel,
  secondaryLabel,
  onSecondaryClick,
  testIdPrefix,
}: {
  title: string;
  idleText: string;
  generatingText: string;
  generateLabel: string;
  secondaryLabel: string;
  onSecondaryClick: () => void;
  testIdPrefix: string;
}) {
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
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

          <button
            onClick={() => {
              if (generationState !== "generated") return;
              onSecondaryClick();
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
            data-testid={`button-secondary-${testIdPrefix}`}
          >
            {secondaryLabel}
          </button>
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

const DOCUMENTS_NAV_ITEMS = [
  "Disclosures",
  "Closing Documents",
];

export function DocumentsContent() {
  return <DisclosuresContent />;
}

export { DOCUMENTS_NAV_ITEMS };
