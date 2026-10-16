import React, { memo, Profiler } from "react";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ChecklistProvider, useChecklist } from "../../client/src/contexts/checklist-context";
import { LoanActivityProvider, useActivityPanel } from "../../client/src/contexts/loan-activity-context";
import { LoanHeader } from "../../client/src/components/loan/LoanHeader";
import { ChecklistPanel } from "../../client/src/components/loan/ChecklistPanel";
import { LoanActivityPanel } from "../../client/src/components/loan/LoanActivityPanel";
import { CollateralContent } from "../../client/src/components/loan/CollateralContent";
import { ProductPricingContent } from "../../client/src/components/loan/ProductPricingContent";
import { DecisioningSummaryContent } from "../../client/src/components/loan/DecisioningSummaryContent";
import { DocumentsContent } from "../../client/src/components/loan/DisclosureDocumentsContent";
import { useClosingDisclosures } from "../../client/src/hooks/use-closing-disclosures";
import { useClosingPackage } from "../../client/src/hooks/use-closing-package";
import { resetClosingDisclosureHistory, updateClosingDisclosureHistory } from "../../client/src/lib/closing-disclosure-history";

// Only the unrelated remote administration surface is replaced.
vi.mock("../../client/src/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));

let checklist: ReturnType<typeof useChecklist>;
let activity: ReturnType<typeof useActivityPanel>;
let counts = { checklist: 0, activity: 0 };
let samples: Array<{ id: string; phase: string; ms: number }> = [];
const ChecklistProbe = memo(function ChecklistProbe() {
  counts.checklist++;
  checklist = useChecklist();
  return null;
});
const ActivityProbe = memo(function ActivityProbe() {
  counts.activity++;
  activity = useActivityPanel();
  return null;
});
function DocumentHooks() {
  // Provider key remounts this component when the synthetic loan changes.
  const id = window.location.pathname.split("/")[2];
  const disclosure = useClosingDisclosures(id);
  const pkg = useClosingPackage(id);
  return <output data-testid="document-probe">{JSON.stringify({
    records: disclosure.records.length, packageState: pkg.generationState,
  })}</output>;
}
const profile = (id: string, child: React.ReactNode) => (
  <Profiler key={id} id={id} onRender={(id, phase, ms) => samples.push({ id, phase, ms })}>
    {child}
  </Profiler>
);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

it("profiles unchanged providers and actual consumers under repeatable synthetic actions", async () => {
  const runs: unknown[] = [];
  const reference = new Map<string, string>();
  // Five fresh mounts; first is reported as cold, remaining four as warm.
  for (let repeat = 0; repeat < 5; repeat++) {
    localStorage.clear();
    let uuid = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() =>
      `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}`);
    const location = memoryLocation({ path: "/loans/fixture-a", record: true });
    window.history.replaceState(null, "", "/loans/fixture-a");
    counts = { checklist: 0, activity: 0 };
    samples = [];
    const view = render(<Router hook={location.hook}>
      <LoanActivityProvider><ChecklistProvider>
        <ChecklistProbe /><ActivityProbe />
        {profile("header", <LoanHeader borrowerName="Synthetic Borrower" loanNumber="TEST" cifNumber="TEST" />)}
        {profile("checklist-panel", <ChecklistPanel onClose={() => {}} />)}
        {profile("activity-panel", <LoanActivityPanel />)}
        {profile("collateral", <CollateralContent />)}
        {profile("pricing", <ProductPricingContent />)}
        {profile("decisioning", <DecisioningSummaryContent />)}
        {profile("disclosures", <DocumentsContent />)}
        {profile("document-hooks", <DocumentHooks />)}
      </ChecklistProvider></LoanActivityProvider>
    </Router>);
    const action = async (name: string, perform: () => unknown, verify: () => void) => {
      counts = { checklist: 0, activity: 0 };
      samples = [];
      const oldChecklist = checklist, oldActivity = activity;
      const start = performance.now();
      await act(async () => { await perform(); });
      const elapsedMs = performance.now() - start;
      verify();
      const output = JSON.stringify({
        text: view.container.textContent,
        tasks: checklist.tasks, reset: checklist.demoResetVersion,
        activityIds: activity.activityItems.map(x => x.id), open: activity.activityPanelOpen,
        storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])),
      });
      if (repeat === 0) reference.set(name, output);
      else expect(output, `repeatable text/state/storage: ${name}`).toBe(reference.get(name));
      runs.push({ repeat, name, counts: { ...counts }, elapsedMs,
        contextIdentityChanged: { checklist: oldChecklist !== checklist, activity: oldActivity !== activity },
        callbackIdentityChanged: {
          completeAction: oldChecklist.completeAction !== checklist.completeAction,
          addActivity: oldActivity.addActivity !== activity.addActivity,
        }, samples: [...samples], outputSha256: hash(output) });
    };
    const status = (index: number) => checklist.getActionStatus("Loan Estimate", index);
    await action("activity-open", () => activity.toggleActivityPanel(), () => expect(activity.activityPanelOpen).toBe(true));
    await action("activity-close", () => activity.closeActivityPanel(), () => expect(activity.activityPanelOpen).toBe(false));
    await action("activity-close-noop", () => activity.closeActivityPanel(), () => expect(activity.activityPanelOpen).toBe(false));
    await action("checklist-complete", () => checklist.completeAction("Loan Estimate", 0),
      () => { expect(status(0)).toBe("complete"); expect(status(1)).toBe("in-progress"); });
    await action("checklist-complete-noop", () => checklist.completeAction("Loan Estimate", 0),
      () => expect(status(1)).toBe("in-progress"));
    await action("checklist-deliver", () => checklist.completeAction("Loan Estimate", 1),
      () => expect(status(1)).toBe("complete"));
    await action("checklist-refire", () => checklist.refireCompletedTask("Loan Estimate", ["re-fire", "re-fire"]),
      () => expect(status(0)).toBe("re-fire"));
    await action("refire-generate", () => checklist.completeAction("Loan Estimate", 0),
      () => { expect(status(0)).toBe("complete"); expect(status(1)).toBe("re-fire"); });
    const record = { id: "synthetic-event", title: "Synthetic event", description: "Fixture only",
      timestamp: "October 14, 2026", date: new Date() };
    await action("activity-add", () => activity.addActivity(record),
      () => expect(activity.activityItems.some(x => x.id === record.id)).toBe(true));
    await action("activity-duplicate", () => activity.addActivity(record),
      () => expect(activity.activityItems.filter(x => x.id === record.id)).toHaveLength(1));
    await action("document-generated-event", () => updateClosingDisclosureHistory("fixture-a", h => ({
      ...h, records: [{ id: 1, generatedAt: new Date().toISOString(), deliveredAt: null }],
    })), () => expect(view.getByTestId("document-probe").textContent).toContain('"records":1'));
    await action("document-scoped-reset", () => resetClosingDisclosureHistory("fixture-a", true),
      () => { expect(checklist.demoResetVersion).toBe(0); expect(status(1)).toBe("re-fire"); });
    await action("same-loan-tab", () => {
      window.history.replaceState(null, "", "/loans/fixture-a/documents");
      location.navigate("/loans/fixture-a/documents");
    }, () => { expect(status(1)).toBe("re-fire"); expect(activity.activityItems.some(x => x.id === record.id)).toBe(true); });
    await action("reset-demo", async () => {
      // Current approved coordinator owns ordering and invokes activity only on success.
      const result = await checklist.resetDemoTasks(
        checklist.tasks.map(x => x.name), activity.resetRuntimeActivities,
      );
      expect(result.outcome).toBe("complete");
    }, () => {
      expect(checklist.demoResetVersion).toBe(1);
      expect(checklist.demoResetPending).toBe(false);
      expect(status(0)).toBe("not-started");
      expect(activity.activityItems.some(x => x.id === record.id)).toBe(false);
    });
    await action("other-loan", () => {
      window.history.replaceState(null, "", "/loans/fixture-b");
      location.navigate("/loans/fixture-b");
    }, () => { expect(checklist.demoResetVersion).toBe(0); expect(activity.activityPanelOpen).toBe(false); });
    await action("return-loan", () => {
      window.history.replaceState(null, "", "/loans/fixture-a");
      location.navigate("/loans/fixture-a");
    }, () => { expect(status(0)).toBe("not-started"); expect(checklist.demoResetVersion).toBe(0); });
    view.unmount();
    vi.restoreAllMocks();
  }
  writeFileSync("../provider-measurements.json", JSON.stringify({
    environment: "React development/jsdom; UTC; fixed Date; real performance clock; no StrictMode",
    workload: "5 fresh mounts, 16 actions each, all context-consuming surfaces mounted together; not a routed production workload",
    runs,
  }, null, 2) + "\n");
}, 120000);
