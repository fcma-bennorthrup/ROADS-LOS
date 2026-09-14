import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { useChecklist } from "@/contexts/checklist-context";
import { useActivityPanel } from "@/contexts/loan-activity-context";
import { ActionTimeline, StatusIcon } from "./ChecklistActionTimeline";

export function ChecklistPanel({ onClose, centerX }: { onClose: () => void; centerX?: number }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { tasks, resetDemoTasks } = useChecklist();
  const { resetRuntimeActivities } = useActivityPanel();

  const completedCount = tasks.filter((t) => t.status === "complete").length;
  const percent = Math.round((completedCount / tasks.length) * 100);
  const handleResetDemo = () => {
    const confirmed = window.confirm(
      "Reset all demo tasks, Subject Property, and demo-generated Loan Activity entries?",
    );
    if (!confirmed) return;

    resetDemoTasks(tasks.map((task) => task.name));
    resetRuntimeActivities();
    setExpanded(null);
  };

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
          <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
            <button
              onClick={handleResetDemo}
              className="caption-100-strong"
              style={{
                backgroundColor: "var(--roads-bg-primary)",
                border: "1px solid var(--roads-border-dark)",
                borderRadius: "var(--roads-radius-2xs)",
                color: "var(--roads-text-primary)",
                padding:
                  "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                whiteSpace: "nowrap",
              }}
              data-testid="button-reset-demo"
            >
              Reset Demo
            </button>
            <button
              onClick={onClose}
              aria-label="Close checklist"
              style={{ color: "var(--roads-icon-dark)", padding: "var(--roads-spacing-component-2xs)" }}
              data-testid="button-close-checklist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
