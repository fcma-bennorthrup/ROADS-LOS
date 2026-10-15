export function DisabledRadio({
  groupName,
  optionValue,
  selectedValue,
  label,
  testId,
}: {
  groupName: string;
  optionValue: string;
  selectedValue: string;
  label: string;
  testId: string;
}) {
  const checked = optionValue === selectedValue;
  return (
    <label
      className="flex items-center body-100"
      style={{
        gap: "var(--roads-spacing-component-xs)",
        color: "var(--roads-text-primary)",
        cursor: "default",
      }}
      data-testid={`radio-${testId}`}
    >
      <input
        type="radio"
        name={groupName}
        checked={checked}
        readOnly
        disabled
        style={{
          width: "16px",
          height: "16px",
          accentColor: "var(--roads-bg-action)",
          flexShrink: 0,
          cursor: "default",
        }}
      />
      {label}
    </label>
  );
}

export function YesNoQuestion({
  question,
  groupName,
  selected,
  testId,
}: {
  question: string;
  groupName: string;
  selected: "yes" | "no";
  testId: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        gap: "var(--roads-spacing-component-l)",
        padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
      }}
      data-testid={`question-${testId}`}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {question}
      </span>
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <DisabledRadio
          groupName={groupName}
          optionValue="yes"
          selectedValue={selected}
          label="Yes"
          testId={`${testId}-yes`}
        />
        <DisabledRadio
          groupName={groupName}
          optionValue="no"
          selectedValue={selected}
          label="No"
          testId={`${testId}-no`}
        />
      </div>
    </div>
  );
}

export function DisabledCheckbox({
  label,
  checked,
  testId,
}: {
  label: string;
  checked: boolean;
  testId: string;
}) {
  return (
    <label
      className="flex items-center body-100"
      style={{
        gap: "var(--roads-spacing-component-xs)",
        color: "var(--roads-text-primary)",
        cursor: "default",
      }}
      data-testid={`checkbox-${testId}`}
    >
      <input
        type="checkbox"
        checked={checked}
        readOnly
        disabled
        style={{
          width: "16px",
          height: "16px",
          accentColor: "var(--roads-bg-action)",
          flexShrink: 0,
          cursor: "default",
        }}
      />
      {label}
    </label>
  );
}

export function MoneyDisplayField({ value, label, testId }: { value: string; label: string; testId: string }) {
  return (
    <div
      className="flex flex-col"
      style={{
        gap: "var(--roads-spacing-component-l)",
        padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
      }}
      data-testid={`field-${testId}`}
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        {label}
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
        <span className="label-strong" style={{ color: "var(--roads-text-secondary)" }}>$</span>
        <span className="label-strong" style={{ flex: 1, color: "var(--roads-text-primary)" }}>
          {value || "\u00A0"}
        </span>
      </div>
    </div>
  );
}

