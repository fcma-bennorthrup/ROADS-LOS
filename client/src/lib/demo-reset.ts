export interface DemoResetResult {
  outcome: "complete" | "incomplete" | "cancelled" | "pending";
  cleared: string[];
  notCleared: string[];
}

interface ResetSteps {
  package?: () => void;
  disclosure?: (committed: () => void) => void | Promise<void>;
  /** Reconcile only document tasks after each successful document clear. */
  documentTasks: (names: string[]) => void;
  checklist: () => void;
  activity?: () => void;
  signal: AbortSignal;
}

/**
 * Ordered, explicitly non-transactional reset. Nothing retries or rolls back.
 * Keep the synchronous path synchronous for browsers without Web Locks.
 */
export function coordinateDemoReset(steps: ResetSteps): DemoResetResult | Promise<DemoResetResult> {
  const cleared: string[] = [];
  const requested = [
    ...(steps.package ? ["Closing Package"] : []),
    ...(steps.disclosure ? ["Closing Disclosure"] : []),
    "Checklist",
    ...(steps.activity ? ["Loan Activity"] : []),
  ];
  const documentTasks: string[] = [];
  let reconciled = false;
  const result = (outcome: DemoResetResult["outcome"]): DemoResetResult => ({
    outcome,
    cleared: [...cleared, ...(reconciled && !cleared.includes("Checklist") ? ["Document checklist tasks"] : [])],
    notCleared: requested.filter((name) => !cleared.includes(name)),
  });
  const failed = () => result(steps.signal.aborted ? "cancelled" : "incomplete");
  const active = () => {
    if (steps.signal.aborted) throw new Error("Demo reset cancelled");
  };
  const documentCleared = (name: string) => {
    cleared.push(name);
    documentTasks.push(name);
    // A denied checklist write must not hide the successful document clear.
    try { steps.documentTasks(documentTasks); reconciled = true; } catch { /* Retain any earlier successful reconciliation. */ }
  };
  const finish = () => {
    try {
      active();
      steps.checklist();
      cleared.push("Checklist");
      if (steps.activity) {
        steps.activity();
        cleared.push("Loan Activity");
      }
      return result("complete");
    } catch {
      return failed();
    }
  };
  try {
    active();
    if (steps.package) {
      steps.package();
      documentCleared("Closing Package");
    }
    if (steps.disclosure) {
      const disclosure = steps.disclosure(() => documentCleared("Closing Disclosure"));
      const afterDisclosure = () => {
        active();
        return finish();
      };
      if (disclosure) {
        // Resolve cancellation immediately, even if a lock implementation keeps
        // the queued callback. The storage callback also checks this signal.
        return new Promise<DemoResetResult>((resolve) => {
          const cancel = () => resolve(failed());
          steps.signal.addEventListener("abort", cancel, { once: true });
          void disclosure.then(() => {
            try { resolve(afterDisclosure()); } catch { resolve(failed()); }
          }, () => resolve(failed())).finally(() => {
            steps.signal.removeEventListener("abort", cancel);
          });
          if (steps.signal.aborted) cancel();
        });
      }
      return afterDisclosure();
    }
    return finish();
  } catch {
    return failed();
  }
}
