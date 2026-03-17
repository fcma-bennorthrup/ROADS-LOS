import { Calendar } from "lucide-react";

function ReadOnlyField({
  label,
  value,
  hasLeadingIcon,
  hasTrailingIcon,
  width,
}: {
  label: string;
  value: string;
  hasLeadingIcon?: boolean;
  hasTrailingIcon?: boolean;
  width?: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ width: width || "288px", gap: "var(--roads-spacing-component-xs)" }}
      data-testid={`field-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span
        className="label-strong"
        style={{ color: "var(--roads-text-primary)", lineHeight: "16px" }}
      >
        {label}
      </span>
      <div
        className="flex items-start w-full"
        style={{
          backgroundColor: "var(--roads-bg-light)",
          border: "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-2xs)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
          gap: "var(--roads-spacing-component-xs)",
        }}
      >
        {hasLeadingIcon && (
          <span
            style={{
              color: "var(--roads-text-secondary)",
              fontSize: "16px",
              lineHeight: "20px",
              fontWeight: 600,
              fontFamily: "var(--roads-font-family)",
            }}
          >
            $
          </span>
        )}
        <span
          style={{
            flex: 1,
            fontFamily: "var(--roads-font-family)",
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: "20px",
            color: "var(--roads-text-primary)",
          }}
        >
          {value}
        </span>
        {hasTrailingIcon && (
          <Calendar
            className="shrink-0"
            style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }}
          />
        )}
      </div>
    </div>
  );
}

function StateZipField({ state, zip }: { state: string; zip: string }) {
  return (
    <div
      className="flex"
      style={{ width: "288px", gap: "var(--roads-spacing-component-l)" }}
      data-testid="field-state-zip"
    >
      <ReadOnlyField label="State" value={state} width="136px" />
      <ReadOnlyField label="Zip" value={zip} width="136px" />
    </div>
  );
}

export function CollateralContent() {
  return (
    <div
      className="flex flex-col flex-1"
      style={{
        padding: "var(--roads-spacing-component-xl) 0",
        paddingBottom: "60px",
        gap: "var(--roads-spacing-component-l)",
      }}
      data-testid="collateral-content"
    >
      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-l)" }}
      >
        <h2
          className="headline-300"
          style={{
            color: "var(--roads-text-primary)",
            padding: "0 var(--roads-spacing-component-3xl)",
          }}
          data-testid="section-subject-property"
        >
          Subject Property
        </h2>
        <div
          className="flex flex-wrap items-center"
          style={{
            padding: "0 var(--roads-spacing-component-3xl)",
            gap: "var(--roads-spacing-component-3xl)",
          }}
        >
          <ReadOnlyField label="Address 1" value="Address" />
          <ReadOnlyField label="Address 2" value="Address 2" />
          <ReadOnlyField label="City" value="Louisville" />
          <ReadOnlyField label="County" value="Louisville" />
          <StateZipField state="KY" zip="40234" />
        </div>
      </div>

      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-xs)" }}
      >
        <div
          className="flex flex-col"
          style={{
            padding: "0 var(--roads-spacing-component-3xl)",
            gap: "var(--roads-spacing-component-xs)",
          }}
        >
          <h2
            className="headline-300"
            style={{ color: "var(--roads-text-primary)" }}
            data-testid="section-value"
          >
            Value
          </h2>
          <div
            className="flex items-start"
            style={{ gap: "var(--roads-spacing-component-l)" }}
          >
            <button
              className="body-200-strong"
              style={{
                backgroundColor: "var(--roads-bg-action)",
                color: "var(--roads-text-reverse)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                borderRadius: "var(--roads-radius-2xs)",
              }}
              data-testid="button-primary"
            >
              Primary
            </button>
            <button
              className="body-200-strong"
              style={{
                backgroundColor: "var(--roads-bg-error-disabled)",
                color: "var(--roads-text-reverse)",
                padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                borderRadius: "var(--roads-radius-2xs)",
              }}
              data-testid="button-destructive"
            >
              Destructive
            </button>
          </div>
        </div>
        <div
          className="flex flex-wrap items-center"
          style={{
            padding: "0 var(--roads-spacing-component-3xl)",
            gap: "var(--roads-spacing-component-3xl)",
          }}
        >
          <ReadOnlyField label="Estimated Value" value="400,000" hasLeadingIcon />
          <ReadOnlyField label="Evaluation Date" value="01/22/2022" hasTrailingIcon />
          <ReadOnlyField label="Appraisal Type" value="As is" />
          <ReadOnlyField label="Land Value" value="100,000" hasLeadingIcon />
        </div>
      </div>
    </div>
  );
}
