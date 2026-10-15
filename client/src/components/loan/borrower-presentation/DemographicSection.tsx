import { DisabledRadio, DisabledCheckbox, MoneyDisplayField } from "./QuestionnaireDisplays";

export function DemographicSection() {
  return (
    <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
      <h3
        className="headline-300"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="section-demographic"
      >
        Demographic Information
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: "var(--roads-spacing-component-xl)",
          rowGap: "var(--roads-spacing-component-2xl)",
        }}
      >
        {/* Left column: Ethnicity, Other hispanic text, Sex */}
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-2xl)" }}>
          <div
            className="flex flex-col"
            style={{
              gap: "var(--roads-spacing-component-l)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
            }}
            data-testid="question-ethnicity"
          >
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              Ethnicity (check one or more):
            </span>
            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
              <DisabledCheckbox label="Hispanic or Latino" checked={false} testId="eth-hispanic" />
              <div
                className="flex flex-col"
                style={{ gap: "var(--roads-spacing-component-l)", paddingLeft: "var(--roads-spacing-component-xl)" }}
              >
                <DisabledCheckbox label="Mexican" checked={false} testId="eth-mexican" />
                <DisabledCheckbox label="Puerto Rican" checked={false} testId="eth-puerto-rican" />
                <DisabledCheckbox label="Cuban" checked={false} testId="eth-cuban" />
                <DisabledCheckbox label="Other Hispanic or Latino" checked={false} testId="eth-other-hispanic" />
              </div>
              <DisabledCheckbox
                label="I do not wish to provide this information"
                checked={true}
                testId="eth-no-provide"
              />
            </div>
          </div>

          <MoneyDisplayField
            label="Other Hispanic or Latino"
            value=""
            testId="eth-other-text"
          />

          <div
            className="flex flex-col"
            style={{
              gap: "var(--roads-spacing-component-l)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
            }}
            data-testid="question-sex"
          >
            <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
              Sex:
            </span>
            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
              <DisabledCheckbox label="Female" checked={false} testId="sex-female" />
              <DisabledCheckbox label="Male" checked={true} testId="sex-male" />
              <DisabledCheckbox
                label="I do not wish to provide this information"
                checked={false}
                testId="sex-no-provide"
              />
            </div>
          </div>
        </div>

        {/* Right column: Race */}
        <div
          className="flex flex-col"
          style={{
            gap: "var(--roads-spacing-component-l)",
            padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
          }}
          data-testid="question-race"
        >
          <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
            Race (check one or more):
          </span>
          <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
            <DisabledCheckbox
              label="American Indian or Alaska Native"
              checked={false}
              testId="race-american-indian"
            />
            <DisabledCheckbox label="Asian" checked={false} testId="race-asian" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: "var(--roads-spacing-component-l)",
                rowGap: "var(--roads-spacing-component-l)",
                paddingLeft: "var(--roads-spacing-component-xl)",
              }}
            >
              <DisabledCheckbox label="Asian Indian" checked={false} testId="race-asian-indian" />
              <DisabledCheckbox label="Filipino" checked={false} testId="race-filipino" />
              <DisabledCheckbox label="Korean" checked={false} testId="race-korean" />
              <DisabledCheckbox label="Other Asian" checked={false} testId="race-other-asian" />
              <DisabledCheckbox label="Chinese" checked={false} testId="race-chinese" />
              <DisabledCheckbox label="Japanese" checked={false} testId="race-japanese" />
              <DisabledCheckbox label="Vietnamese" checked={false} testId="race-vietnamese" />
            </div>
            <DisabledCheckbox
              label="Black or African American"
              checked={false}
              testId="race-black"
            />
            <DisabledCheckbox
              label="Native Hawaiian or Other Pacific Islander"
              checked={false}
              testId="race-native-hawaiian-pi"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: "var(--roads-spacing-component-l)",
                rowGap: "var(--roads-spacing-component-l)",
                paddingLeft: "var(--roads-spacing-component-xl)",
              }}
            >
              <DisabledCheckbox label="Native Hawaiian" checked={false} testId="race-hawaiian" />
              <DisabledCheckbox
                label="Guamanian or Chamorro"
                checked={false}
                testId="race-guamanian"
              />
              <DisabledCheckbox label="Samoan" checked={false} testId="race-samoan" />
              <DisabledCheckbox
                label="Other Pacific Islander"
                checked={false}
                testId="race-other-pi"
              />
            </div>
            <DisabledCheckbox label="White" checked={true} testId="race-white" />
            <DisabledCheckbox
              label="I do not wish to provide this information"
              checked={false}
              testId="race-no-provide"
            />
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--roads-border-subtle)", margin: "var(--roads-spacing-component-l) 0" }} />

      <div
        className="flex flex-col"
        style={{
          gap: "var(--roads-spacing-component-l)",
          padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
        }}
        data-testid="question-collection-method"
      >
        <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
          The demographic information was provided through:
        </span>
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
          <DisabledRadio
            groupName="demographic-method"
            optionValue="face-to-face"
            selectedValue="face-to-face"
            label="Face-to-face interview (includes electronic media w/ video component)"
            testId="method-face-to-face"
          />
          <DisabledRadio
            groupName="demographic-method"
            optionValue="telephone"
            selectedValue="face-to-face"
            label="Telephone interview"
            testId="method-telephone"
          />
          <DisabledRadio
            groupName="demographic-method"
            optionValue="fax-mail"
            selectedValue="face-to-face"
            label="Fax or mail"
            testId="method-fax-mail"
          />
          <DisabledRadio
            groupName="demographic-method"
            optionValue="email-internet"
            selectedValue="face-to-face"
            label="Email or internet"
            testId="method-email-internet"
          />
        </div>
      </div>
    </div>
  );
}

