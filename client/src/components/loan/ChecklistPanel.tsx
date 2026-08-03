import { useState } from "react";
import { X, Check, Minus, ChevronDown } from "lucide-react";
import { useChecklist, ChecklistStatus, ChecklistAction } from "@/contexts/checklist-context";

function StatusIcon({ status, size = 20 }: { status: ChecklistStatus; size?: number }) {
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
  if (status === "in-progress") {
    return (
      <span style={{ ...common, backgroundColor: "var(--roads-bg-information-subtle, #dcf2ff)" }} data-testid="status-icon-in-progress">
        <span
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: "var(--roads-radius-round)",
            border: `${Math.max(2, size * 0.18)}px solid var(--roads-text-information)`,
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
  if (status === "complete" || status === "not-started") return null;
  const isBlocked = status === "blocked";
  return (
    <span
      className="caption-100-strong"
      style={{
        display: "inline-block",
        padding: "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
        borderRadius: "var(--roads-radius-2xs)",
        backgroundColor: isBlocked ? "var(--roads-bg-error-subtle)" : "var(--roads-bg-information-subtle)",
        color: isBlocked ? "var(--roads-text-error)" : "var(--roads-text-information)",
      }}
      data-testid={`chip-${status}`}
    >
      {isBlocked ? "Blocked" : "In Progress"}
    </span>
  );
}

function ActionTimeline({ actions }: { actions: ChecklistAction[] }) {
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
        const isLast = i === actions.length - 1;
        const nodeColor =
          action.status === "complete"
            ? "var(--roads-bg-success)"
            : action.status === "in-progress"
              ? "var(--roads-text-information)"
              : action.status === "blocked"
                ? "var(--roads-bg-error)"
                : "var(--roads-bg-primary)";
        return (
          <div key={action.label} className="flex" style={{ gap: "var(--roads-spacing-component-m)" }}>
            <div className="flex flex-col items-center" style={{ width: 16, flexShrink: 0 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "var(--roads-radius-round)",
                  backgroundColor: nodeColor,
                  border:
                    action.status === "not-started"
                      ? "1.5px solid var(--roads-border-dark)"
                      : `1.5px solid ${nodeColor}`,
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              {!isLast && (
                <span
                  style={{
                    width: 2,
                    flex: 1,
                    backgroundColor: nodeColor === "var(--roads-bg-primary)" ? "var(--roads-border-subtle)" : nodeColor,
                    minHeight: 24,
                  }}
                />
              )}
            </div>
            <div
              className="flex flex-col"
              style={{
                gap: "var(--roads-spacing-component-3xs)",
                paddingBottom: isLast ? 0 : "var(--roads-spacing-component-l)",
              }}
              data-testid={`action-row-${i}`}
            >
              <span className="caption-100-strong" style={{ color: "var(--roads-text-primary)" }}>
                {action.label}
              </span>
              <span className="body-200" style={{ color: "var(--roads-text-secondary)" }}>
                {action.description}
              </span>
              <StatusChip status={action.status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChecklistPanel({ onClose, centerX }: { onClose: () => void; centerX?: number }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { tasks } = useChecklist();

  const completedCount = tasks.filter((t) => t.status === "complete").length;
  const percent = Math.round((completedCount / tasks.length) * 100);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "100%",
        left: centerX !== undefined ? centerX : "50%",
        transform: "translateX(-50%)",
        marginBottom: "var(--roads-spacing-component-xs)",
        width: 420,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--roads-bg-primary)",
        borderRadius: "var(--roads-radius-xs)",
        border: "1px solid var(--roads-border-subtle)",
        boxShadow: "0px 8px 16px rgba(39,51,51,0.24)",
        animation: "checklist-slide-up 200ms ease-out",
      }}
      data-testid="checklist-panel"
    >
      <style>{`@keyframes checklist-slide-up { from { transform: translateX(-50%) translateY(16px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`}</style>
      <div
        className="flex flex-col"
        style={{
          padding:
            "var(--roads-spacing-component-l) var(--roads-spacing-component-l) var(--roads-spacing-component-m)",
          gap: "var(--roads-spacing-component-xs)",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="headline-200" style={{ color: "var(--roads-text-primary)" }}>
            Loan Checklist
          </h2>
          <button
            onClick={onClose}
            aria-label="Close checklist"
            style={{ color: "var(--roads-icon-dark)", padding: "var(--roads-spacing-component-2xs)" }}
            data-testid="button-close-checklist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-2xs)" }}>
          <span className="caption-100" style={{ color: "var(--roads-text-secondary)" }} data-testid="text-percent-complete">
            {percent}% Complete
          </span>
          <div
            style={{
              height: 8,
              borderRadius: "var(--roads-radius-round)",
              backgroundColor: "var(--roads-bg-dark)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: "100%",
                borderRadius: "var(--roads-radius-round)",
                backgroundColor: "var(--roads-bg-brand)",
              }}
              data-testid="progress-bar-fill"
            />
          </div>
        </div>
      </div>
      <div
        className="flex flex-col"
        style={{
          overflowY: "auto",
          padding:
            "0 var(--roads-spacing-component-l) var(--roads-spacing-component-l)",
          gap: "var(--roads-spacing-component-xs)",
        }}
      >
        {tasks.map((task, i) => {
          const isExpanded = expanded === i;
          const actionsComplete = task.actions.filter((a) => a.status === "complete").length;
          return (
            <div
              key={task.name}
              style={{
                border: "1px solid var(--roads-border-subtle)",
                borderRadius: "var(--roads-radius-xs)",
                backgroundColor: "var(--roads-bg-primary)",
                flexShrink: 0,
              }}
              data-testid={`checklist-task-${task.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <button
                className="flex items-center w-full"
                onClick={() => setExpanded(isExpanded ? null : i)}
                style={{
                  gap: "var(--roads-spacing-component-m)",
                  padding: "var(--roads-spacing-component-m) var(--roads-spacing-component-l)",
                  textAlign: "left",
                }}
                aria-expanded={isExpanded}
                data-testid={`button-expand-task-${i}`}
              >
                <StatusIcon status={task.status} />
                <span
                  className="body-200-strong"
                  style={{ color: "var(--roads-text-primary)", flex: 1, minWidth: 0 }}
                >
                  {task.name}
                </span>
                <span
                  className="caption-100-strong"
                  style={{ color: "var(--roads-text-link)", whiteSpace: "nowrap" }}
                  role="link"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-view-task-${i}`}
                >
                  View Task
                </span>
                <span
                  className="caption-100"
                  style={{ color: "var(--roads-text-secondary)", whiteSpace: "nowrap" }}
                >
                  {actionsComplete} of {task.actions.length} Complete
                </span>
                <ChevronDown
                  style={{
                    width: 16,
                    height: 16,
                    color: "var(--roads-icon-dark)",
                    flexShrink: 0,
                    transform: isExpanded ? "rotate(180deg)" : "none",
                    transition: "transform 150ms ease",
                  }}
                />
              </button>
              {isExpanded && <ActionTimeline actions={task.actions} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
