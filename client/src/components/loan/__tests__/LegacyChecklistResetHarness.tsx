import type { ComponentProps } from "react";
import { ChecklistPanel as ActualChecklistPanel } from "../ChecklistPanel";
import { useChecklist } from "@/contexts/checklist-context";
import { useActivityPanel } from "@/contexts/loan-activity-context";

/**
 * Retain coverage of the legacy reset API used by isolated document consumers.
 * This test-only command is NOT part of ChecklistPanel or the new database reset.
 */
export function ChecklistPanel(props: ComponentProps<typeof ActualChecklistPanel>) {
  const { tasks, resetDemoTasks, demoResetPending } = useChecklist();
  const { resetRuntimeActivities } = useActivityPanel();
  return <>
    <ActualChecklistPanel {...props} />
    <button disabled={demoResetPending} onClick={() => {
      if (window.confirm("Reset legacy demo task state?")) {
        void resetDemoTasks(tasks.map(task => task.name), resetRuntimeActivities);
      }
    }}>Reset Demo</button>
  </>;
}
