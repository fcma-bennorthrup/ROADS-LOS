import { Check, Minus } from "lucide-react";
import { ChecklistAction, ChecklistStatus } from "@/contexts/checklist-context";

export function StatusIcon({ status, size = 20 }: { status: ChecklistStatus; size?: number }) {
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "var(--roads-radius-round)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  if (status === "complete") {
    return (
      <span style={{ ...common, backgroundColor: "var(--roads-bg-success)" }} data-testid="status-icon-complete">
        <Check style={{ width: size * 0.6, height: size * 0.6, color: "var(--roads-text-reverse)" }} strokeWidth={3} />
      </span>
    );
  }

  if (status === "blocked") {
    return (
      <span style={{ ...common, backgroundColor: "var(--roads-bg-error)" }} data-testid="status-icon-blocked">
        <Minus style={{ width: size * 0.6, height: size * 0.6, color: "var(--roads-text-reverse)" }} strokeWidth={3} />
      </span>
    );
  }

  if (status === "in-progress" || status === "re-fire") {
    const isReFire = status === "re-fire";
    return (
      <span
        style={{
          ...common,
          backgroundColor: isReFire
            ? "var(--roads-bg-warning-subtle)"
            : "var(--roads-bg-information-subtle)",
        }}
        data-testid={`status-icon-${status}`}
      >
        <span
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: "var(--roads-radius-round)",
            border: `${Math.max(2, size * 0.18)}px solid ${
              isReFire ? "var(--roads-text-warning)" : "var(--roads-text-information)"
            }`,
            backgroundColor: "var(--roads-bg-primary)",
            display: "block",
          }}
        />
      </span>
    );
  }

  return (
    <span
      style={{
        ...common,
        border: "1.5px dashed var(--roads-border-dark)",
        backgroundColor: "var(--roads-bg-primary)",
      }}
      data-testid="status-icon-not-started"
    />
  );
}

function StatusChip({ status }: { status: ChecklistStatus }) {
  if (status === "not-started") return null;

  const treatments = {
    complete: {
      label: "Complete",
      backgroundColor: "var(--roads-bg-success-subtle)",
      color: "var(--roads-text-success)",
    },
    "in-progress": {
      label: "In Progress",
      backgroundColor: "var(--roads-bg-information-subtle)",
      color: "var(--roads-text-information)",
    },
    blocked: {
      label: "Blocked",
      backgroundColor: "var(--roads-bg-error-subtle)",
      color: "var(--roads-text-error)",
    },
    "re-fire": {
      label: "Re-fire",
      backgroundColor: "var(--roads-bg-warning-subtle)",
      color: "var(--roads-text-warning)",
    },
  } as const;
  const treatment = treatments[status];

  return (
    <span
      className="caption-100-strong"
      style={{
        display: "inline-block",
        padding: "0 var(--roads-spacing-component-2xs)",
        borderRadius: "var(--roads-radius-2xs)",
        backgroundColor: treatment.backgroundColor,
        color: treatment.color,
      }}
      data-testid={`chip-${status}`}
    >
      {treatment.label}
    </span>
  );
}

export function ActionTimeline({ actions }: { actions: ChecklistAction[] }) {
  return (
    <div
      className="flex flex-col"
      style={{
        padding:
          "var(--roads-spacing-component-xs) var(--roads-spacing-component-l) var(--roads-spacing-component-l) var(--roads-spacing-component-2xl)",
      }}
      data-testid="action-timeline"
    >
      {actions.map((action, i) => {
        const trackerColor =
          action.status === "complete"
            ? "var(--roads-bg-success)"
            : action.status === "in-progress"
              ? "var(--roads-bg-brand)"
              : action.status === "blocked"
                ? "var(--roads-bg-error)"
                : action.status === "re-fire"
                  ? "var(--roads-text-warning)"
                  : "var(--roads-text-tertiary)";

        return (
          <div key={action.label} className="flex flex-col" data-testid={`action-row-${i}`}>
            <div
              className="flex items-center"
              style={{ gap: "var(--roads-spacing-component-xs)", width: "100%" }}
            >
              <StatusIcon status={action.status} />
              <span className="body-200-strong" style={{ color: "var(--roads-text-primary)" }}>
                {action.label}
              </span>
            </div>
            <div
              className="flex items-start"
              style={{
                gap: "var(--roads-spacing-component-l)",
                paddingLeft: 9,
              }}
            >
              <span
                data-testid={`action-tracker-${action.status}`}
                style={{
                  width: 2,
                  height: 48,
                  backgroundColor: trackerColor,
                  flexShrink: 0,
                }}
              />
              <div
                className="flex flex-col items-start"
                style={{ gap: "var(--roads-spacing-component-2xs)" }}
              >
                <span className="body-200" style={{ color: "var(--roads-text-secondary)" }}>
                  {action.description}
                </span>
                <StatusChip status={action.status} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}