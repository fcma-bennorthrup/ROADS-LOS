import { createContext, useContext, useState, ReactNode } from "react";

export type ChecklistStatus = "not-started" | "in-progress" | "blocked" | "complete";

export interface ChecklistAction {
  label: string;
  description: string;
  status: ChecklistStatus;
}

export interface ChecklistTask {
  name: string;
  status: ChecklistStatus;
  actions: ChecklistAction[];
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
    name: "HMDA",
    status: "complete",
    actions: [
      { label: "Action #1", description: "Collect HMDA data", status: "complete" },
      { label: "Action #2", description: "Submit HMDA report", status: "complete" },
    ],
  },
  {
    name: "Loan Decision",
    status: "complete",
    actions: [
      { label: "Action #1", description: "Record loan decision", status: "complete" },
    ],
  },
  {
    name: "Decision Letter",
    status: "complete",
    actions: [
      { label: "Action #1", description: "Generate decision letter", status: "complete" },
      { label: "Action #2", description: "Send decision letter", status: "complete" },
    ],
  },
  {
    name: "Required Docs",
    status: "complete",
    actions: [
      { label: "Action #1", description: "Request required documents", status: "complete" },
      { label: "Action #2", description: "Verify received documents", status: "complete" },
    ],
  },
  {
    name: "Fees",
    status: "in-progress",
    actions: [
      { label: "Action #1", description: "Enter loan fees", status: "complete" },
      { label: "Action #2", description: "Review and finalize fees", status: "in-progress" },
    ],
  },
  {
    name: "Property Taxes",
    status: "in-progress",
    actions: [
      { label: "Action #1", description: "Pull property tax records", status: "complete" },
      { label: "Action #2", description: "Verify tax amounts", status: "in-progress" },
    ],
  },
  {
    name: "Loan Estimate",
    status: "in-progress",
    actions: [
      { label: "Action #1", description: "Generate loan estimate", status: "complete" },
      { label: "Action #2", description: "Deliver loan estimate", status: "in-progress" },
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
      { label: "Action #1", description: "Confirm rate with borrower", status: "not-started" },
      { label: "Action #2", description: "Lock rate", status: "not-started" },
      { label: "Action #3", description: "Send rate lock letter", status: "not-started" },
    ],
  },
  {
    name: "PTF Conditions",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Identify prior-to-funding conditions", status: "not-started" },
      { label: "Action #2", description: "Clear prior-to-funding conditions", status: "not-started" },
    ],
  },
  {
    name: "Closing Conditions",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Identify closing conditions", status: "not-started" },
      { label: "Action #2", description: "Clear closing conditions", status: "not-started" },
    ],
  },
  {
    name: "Prelim CD",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Prepare preliminary closing disclosure", status: "not-started" },
      { label: "Action #2", description: "Deliver preliminary closing disclosure", status: "not-started" },
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
    name: "Booking",
    status: "not-started",
    actions: [
      { label: "Action #1", description: "Book loan in core system", status: "not-started" },
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

/** Derive the parent task status from its actions. */
function deriveTaskStatus(actions: ChecklistAction[]): ChecklistStatus {
  if (actions.every((a) => a.status === "complete")) return "complete";
  if (actions.some((a) => a.status === "blocked")) return "blocked";
  if (actions.some((a) => a.status === "in-progress" || a.status === "complete")) return "in-progress";
  return "not-started";
}

interface ChecklistContextValue {
  tasks: ChecklistTask[];
  /**
   * Mark an action complete and automatically advance the next action to
   * in-progress. If the action is already complete, this is a no-op.
   */
  completeAction: (taskName: string, actionIndex: number) => void;
  /** Read the current status of a specific action. */
  getActionStatus: (taskName: string, actionIndex: number) => ChecklistStatus;
  /**
   * Reset the given task names back to their initial not-started state so
   * demos can be rerun without a full page reload.
   */
  resetTasks: (taskNames: string[]) => void;
}

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

export function ChecklistProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<ChecklistTask[]>(INITIAL_TASKS);

  const completeAction = (taskName: string, actionIndex: number) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.name !== taskName) return task;
        const updatedActions = task.actions.map((action, i) => {
          if (i === actionIndex) return { ...action, status: "complete" as ChecklistStatus };
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

  const resetTasks = (taskNames: string[]) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (!taskNames.includes(task.name)) return task;
        const initial = INITIAL_TASKS.find((t) => t.name === task.name);
        return initial ? { ...initial, actions: initial.actions.map((a) => ({ ...a })) } : task;
      })
    );
  };

  return (
    <ChecklistContext.Provider value={{ tasks, completeAction, getActionStatus, resetTasks }}>
      {children}
    </ChecklistContext.Provider>
  );
}

export function useChecklist(): ChecklistContextValue {
  const ctx = useContext(ChecklistContext);
  if (!ctx) throw new Error("useChecklist must be used inside <ChecklistProvider>");
  return ctx;
}
