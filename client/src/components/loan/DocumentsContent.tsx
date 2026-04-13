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

function DisclosuresContent() {
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
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const year = now.getFullYear();
      let hours = now.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const timestamp = `${month}/${day}/${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
      setLastGenerated(timestamp);
      setGenerationState("generated");
    }, 5000);
  };

  const handleViewEstimate = () => {
    window.open("/loan-estimate.pdf", "_blank");
  };

  return (
    <div
      className="flex flex-col"
      style={{
        padding: "var(--roads-spacing-component-xl)",
        gap: "var(--roads-spacing-component-l)",
      }}
      data-testid="disclosures-content"
    >
      <h2
        className="headline-200"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-loan-estimate-title"
      >
        Loan Estimate{" "}
      </h2>

      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-l)" }}
      >
        <p
          className="body-100"
          style={{ color: "var(--roads-text-secondary)" }}
          data-testid="text-generation-status"
        >
          {generationState === "idle" && "No Loan Estimates have been generated"}
          {generationState === "generating" && (
            <span>
              Generating Loan Estimate<AnimatedEllipsis />
            </span>
          )}
          {generationState === "generated" && `Last Generated: ${lastGenerated}`}
        </p>

        <div
          className="flex items-center"
          style={{ gap: "var(--roads-spacing-component-l)" }}
        >
          <button
            onClick={handleGenerate}
            disabled={generationState === "generating"}
            className="label-strong"
            style={{
              backgroundColor:
                generationState === "generating"
                  ? "var(--roads-bg-action-disabled)"
                  : "var(--roads-bg-action)",
              color: "var(--roads-text-reverse)",
              padding:
                "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border: "none",
              cursor:
                generationState === "generating" ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
            data-testid="button-generate-loan-estimate"
          >
            Generate Loan Estimate
          </button>

          <button
            onClick={handleViewEstimate}
            disabled={generationState !== "generated"}
            className="label-strong"
            style={{
              backgroundColor: "var(--roads-bg-primary)",
              color:
                generationState !== "generated"
                  ? "var(--roads-text-tertiary)"
                  : "var(--roads-text-primary)",
              padding:
                "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              borderRadius: "var(--roads-radius-2xs)",
              border:
                "1px solid var(--roads-border-dark)",
              cursor:
                generationState !== "generated" ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              opacity: generationState !== "generated" ? 0.5 : 1,
            }}
            data-testid="button-view-loan-estimate"
          >
            View Loan Estimate
          </button>
        </div>
      </div>
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
