import { Calendar } from "lucide-react";
import { YesNoQuestion, DisabledCheckbox } from "./QuestionnaireDisplays";

export function MilitarySection() {
  return (
    <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
      <h3
        className="headline-300"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="section-military"
      >
        Military Service
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: "var(--roads-spacing-component-xl)",
          rowGap: "var(--roads-spacing-component-2xl)",
        }}
      >
        <YesNoQuestion
          question="Did you (or your deceased spouse) ever serve, or are you currently serving in the United States Armed Forces?"
          groupName="military-served"
          selected="no"
          testId="military-served"
        />
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-2xl)" }}>
          <div
            className="flex flex-col"
            style={{
              gap: "var(--roads-spacing-component-l)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
            }}
          >
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              If yes, check all that apply:
            </span>
            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
              <DisabledCheckbox
                label="Currently serving on active duty with projected expiration date of service/tour"
                checked={false}
                testId="active-duty"
              />
              <DisabledCheckbox
                label="Currently retired, discharged, or separated from service"
                checked={false}
                testId="retired-discharged"
              />
              <DisabledCheckbox
                label="Only period of service was as a non-activated member of the Reserve or National Guard"
                checked={false}
                testId="reserve-guard"
              />
              <DisabledCheckbox label="Surviving spouse" checked={false} testId="surviving-spouse" />
            </div>
          </div>
          <div
            className="flex flex-col"
            style={{
              gap: "var(--roads-spacing-component-l)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
            }}
            data-testid="field-projected-expiration"
          >
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              Projected Expiration of Service/Tour
            </span>
            <div
              className="flex items-center"
              style={{
                maxWidth: "320px",
                backgroundColor: "var(--roads-bg-light)",
                border: "1px solid var(--roads-border-subtle)",
                borderRadius: "var(--roads-radius-2xs)",
                padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
                gap: "var(--roads-spacing-component-xs)",
                height: "44px",
              }}
            >
              <span className="label-strong" style={{ flex: 1, color: "var(--roads-text-primary)" }}>
                {"\u00A0"}
              </span>
              <Calendar style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

