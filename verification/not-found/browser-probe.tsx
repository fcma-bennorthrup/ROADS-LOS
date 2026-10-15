import { useActivityPanel } from "@/contexts/loan-activity-context";
import { useChecklist } from "@/contexts/checklist-context";
import { useGitHubSyncContext } from "@/contexts/github-sync-context";

// Test-only known-page sentinel. Never inserted into NotFound.
export default function Probe() {
  const activity = useActivityPanel();
  const checklist = useChecklist();
  const sync = useGitHubSyncContext();
  return <section data-testid="browser-probe">
    <output id="panel">{String(activity.activityPanelOpen)}</output>
    <output id="decision">{checklist.getActionStatus("Loan Decision", 0)}</output>
    <button id="toggle" onClick={activity.toggleActivityPanel}>Fixture toggle</button>
    <button id="save" onClick={() => checklist.setActionStatus("Loan Decision", 0, "complete")}>Fixture save</button>
    <button id="open" onClick={sync.openConflictDialog}>Fixture open</button>
    <button id="pull" onClick={() => sync.pullMutation.mutate()}>Fixture pull</button>
  </section>;
}
