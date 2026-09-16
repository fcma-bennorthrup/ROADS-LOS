import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { dismissToasts } from "@/hooks/use-toast";

export type ChecklistStatus = "not-started" | "in-progress" | "blocked" | "re-fire" | "complete";

export interface ChecklistAction {
  label: string;
  description: string;
  status: ChecklistStatus;
}

export interface ChecklistTask {
  name: string;
  status: ChecklistStatus;
  actions: ChecklistAction[];
  supportsFullRefireLifecycle?: boolean;
}

const INITIAL_TASKS: ChecklistTask[] = [
  {
    name: "Eligibility & Scope",
    status: "complete",
    actions: [
      { label: "Action #1", description: "Verify borrower eligibility", status: "complete" },
      { label: "Action #2", description: "Confirm loan scope", status: "complete" },
    ],
  },
  {
    name: "TC/TN",
    status: "complete",
    actions: [
      { label: "Action #1", description: "Prepare terms and conditions", status: "complete" },
      { label: "Action #2", description: "Review terms and conditions", status: "complete" },
      { label: "Action #3", description: "Send terms notification", status: "complete" },
    ],
  },
  {
    name: "Loan Decision",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Record loan decision", status: "not-started" },
    ],
  },
  {
    name: "Decision Letter",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Generate decision letter", status: "not-started" },
      { label: "Action #2", description: "Send decision letter", status: "not-started" },
    ],
  },
  {
    name: "Loan Estimate",
    status: "not-started",
    supportsFullRefireLifecycle: true,
    actions: [
      { label: "Action #1", description: "Generate loan estimate", status: "not-started" },
      { label: "Action #2", description: "Deliver loan estimate", status: "not-started" },
    ],
  },
  {
    name: "Early Disclosures",
    status: "not-started",
    supportsFullRefireLifecycle: true,
    actions: [
      { label: "Action #1", description: "Generate Early Disclosures", status: "not-started" },
      { label: "Action #2", description: "Deliver Early Disclosures", status: "not-started" },
    ],
  },
  {
    // Title Work — reset to not-started so Collateral task buttons drive it
    name: "Title Work",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Order title work", status: "not-started" },
      { label: "Action #2", description: "Review title commitment", status: "not-started" },
      { label: "Action #3", description: "Clear title exceptions", status: "not-started" },
    ],
  },
  {
    // Appraisal Evaluation — reset to not-started so Collateral task buttons drive it
    name: "Appraisal Evaluation",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Order appraisal evaluation", status: "not-started" },
      { label: "Action #2", description: "Complete appraisal evaluation", status: "not-started" },
      { label: "Action #3", description: "Deliver appraisal evaluation", status: "not-started" },
    ],
  },
  {
    name: "Rate Lock",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Initiate Rate Lock", status: "not-started" },
      { label: "Action #2", description: "Generate Rate Lock Letter", status: "not-started" },
      { label: "Action #3", description: "Deliver Rate Lock Letter", status: "not-started" },
    ],
  },
  {
    name: "Closing Disclosure",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Generate closing disclosure", status: "not-started" },
      { label: "Action #2", description: "Deliver closing disclosure", status: "not-started" },
    ],
  },
  {
    name: "Closing Package",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Assemble closing package", status: "not-started" },
      { label: "Action #2", description: "Review closing package", status: "not-started" },
      { label: "Action #3", description: "Send closing package", status: "not-started" },
    ],
  },
  {
    name: "Wires",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Set up wire instructions", status: "not-started" },
      { label: "Action #2", description: "Verify wire instructions", status: "not-started" },
      { label: "Action #3", description: "Submit wire request", status: "not-started" },
      { label: "Action #4", description: "Confirm wire receipt", status: "not-started" },
    ],
  },
  {
    name: "Pre-Closing Review",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Complete pre-closing checklist", status: "not-started" },
      { label: "Action #2", description: "Sign off on pre-closing review", status: "not-started" },
    ],
  },
  {
    name: "Post Closing Review",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Complete post-closing checklist", status: "not-started" },
      { label: "Action #2", description: "Sign off on post-closing review", status: "not-started" },
    ],
  },
  {
    name: "Loan Certification",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Prepare certification documents", status: "not-started" },
      { label: "Action #2", description: "Certify loan", status: "not-started" },
    ],
  },
];

const CHECKLIST_STORAGE_PREFIX = "loan-checklist-statuses";
const CHECKLIST_STATUSES: ChecklistStatus[] = [
  "not-started",
  "in-progress",
  "blocked",
  "re-fire",
  "complete",
];

function getLoanStorageKey(location: string): string {
  const loanId = location.match(/^\/loans\/([^/]+)/)?.[1] ?? "prototype";
  return `${CHECKLIST_STORAGE_PREFIX}:${loanId}`;
}

function loadTasks(storageKey: string): ChecklistTask[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Record<string, unknown>;

    return INITIAL_TASKS.map((task) => {
      const statuses = saved[task.name];
      if (!Array.isArray(statuses)) {
        return { ...task, actions: task.actions.map((action) => ({ ...action })) };
      }

      const actions = task.actions.map((action, index) => {
        const status = statuses[index];
        return {
          ...action,
          status:
            typeof status === "string" && CHECKLIST_STATUSES.includes(status as ChecklistStatus)
              ? (status as ChecklistStatus)
              : action.status,
        };
      });
      return { ...task, actions, status: deriveTaskStatus(actions) };
    });
  } catch {
    return INITIAL_TASKS.map((task) => ({
      ...task,
      actions: task.actions.map((action) => ({ ...action })),
    }));
  }
}

/** Derive the parent task status from its actions. */
function deriveTaskStatus(actions: ChecklistAction[]): ChecklistStatus {
  if (actions.every((a) => a.status === "complete")) return "complete";
  if (actions.some((a) => a.status === "blocked")) return "blocked";
  if (actions.some((a) => a.status === "re-fire")) return "re-fire";
  if (actions.some((a) => a.status === "in-progress" || a.status === "complete")) {
    return "in-progress";
  }
  return "not-started";
}

interface ChecklistContextValue {
  tasks: ChecklistTask[];
  demoResetVersion: number;
  /** Set an action to an explicit status and derive its parent task status. */
  setActionStatus: (taskName: string, actionIndex: number, status: ChecklistStatus) => void;
  /**
   * Mark an action complete and automatically advance the next action to
   * in-progress. For tasks configured for the full re-fire lifecycle, advance
   * all subsequent incomplete actions to re-fire instead. If the action is
   * already complete, this is a no-op.
   */
  completeAction: (taskName: string, actionIndex: number) => void;
  /** Read the current status of a specific action. */
  getActionStatus: (taskName: string, actionIndex: number) => ChecklistStatus;
  /** Reopen a completed task with explicit action statuses. */
  refireCompletedTask: (taskName: string, actionStatuses: ChecklistStatus[]) => void;
  /**
   * Reset the given task names back to their initial not-started state so
   * demos can be rerun without a full page reload.
   */
  resetTasks: (taskNames: string[]) => void;
  /** Reset tasks and notify mounted demo surfaces to clear their local state. */
  resetDemoTasks: (taskNames: string[]) => void;
}

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

function ChecklistStateProvider({
  children,
  storageKey,
}: {
  children: ReactNode;
  storageKey: string;
}) {
  const [tasks, setTasks] = useState<ChecklistTask[]>(() => loadTasks(storageKey));
  const [demoResetVersion, setDemoResetVersion] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(
          Object.fromEntries(
            tasks.map((task) => [task.name, task.actions.map((action) => action.status)]),
          ),
        ),
      );
    } catch {
      // The prototype remains usable when browser storage is unavailable.
    }
  }, [storageKey, tasks]);

  const setActionStatus = (
    taskName: string,
    actionIndex: number,
    status: ChecklistStatus,
  ) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.name !== taskName) return task;
        const updatedActions = task.actions.map((action, index) =>
          index === actionIndex ? { ...action, status } : action,
        );
        return { ...task, actions: updatedActions, status: deriveTaskStatus(updatedActions) };
      }),
    );
  };

  const completeAction = (taskName: string, actionIndex: number) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.name !== taskName) return task;
        const completedAction = task.actions[actionIndex];
        if (!completedAction || completedAction.status === "complete") return task;

        const continuesFullRefireLifecycle =
          task.supportsFullRefireLifecycle === true &&
          task.status === "re-fire" &&
          completedAction.status === "re-fire";
        const updatedActions = task.actions.map((action, i) => {
          if (i === actionIndex) return { ...action, status: "complete" as ChecklistStatus };
          if (
            continuesFullRefireLifecycle &&
            i > actionIndex &&
            action.status !== "complete"
          ) {
            return { ...action, status: "re-fire" as ChecklistStatus };
          }
          if (i === actionIndex + 1 && action.status === "not-started")
            return { ...action, status: "in-progress" as ChecklistStatus };
          return action;
        });
        return { ...task, actions: updatedActions, status: deriveTaskStatus(updatedActions) };
      })
    );
  };

  const getActionStatus = (taskName: string, actionIndex: number): ChecklistStatus => {
    const task = tasks.find((t) => t.name === taskName);
    return task?.actions[actionIndex]?.status ?? "not-started";
  };

  const refireCompletedTask = (
    taskName: string,
    actionStatuses: ChecklistStatus[],
  ) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.name !== taskName || task.status !== "complete") return task;
        const updatedActions = task.actions.map((action, index) => ({
          ...action,
          status: actionStatuses[index] ?? action.status,
        }));
        return { ...task, actions: updatedActions, status: deriveTaskStatus(updatedActions) };
      }),
    );
  };

  const resetTasks = (taskNames: string[]) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (!taskNames.includes(task.name)) return task;
        const initial = INITIAL_TASKS.find((t) => t.name === task.name);
        return initial ? { ...initial, actions: initial.actions.map((a) => ({ ...a })) } : task;
      })
    );
  };

  const resetDemoTasks = (taskNames: string[]) => {
    dismissToasts();
    resetTasks(taskNames);
    setDemoResetVersion((version) => version + 1);
  };

  return (
    <ChecklistContext.Provider
      value={{
        tasks,
        demoResetVersion,
        setActionStatus,
        completeAction,
        getActionStatus,
        refireCompletedTask,
        resetTasks,
        resetDemoTasks,
      }}
    >
      {children}
    </ChecklistContext.Provider>
  );
}

export function ChecklistProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const storageKey = getLoanStorageKey(location);

  return (
    <ChecklistStateProvider key={storageKey} storageKey={storageKey}>
      {children}
    </ChecklistStateProvider>
  );
}

export function useChecklist(): ChecklistContextValue {
  const ctx = useContext(ChecklistContext);
  if (!ctx) throw new Error("useChecklist must be used inside <ChecklistProvider>");
  return ctx;
}
