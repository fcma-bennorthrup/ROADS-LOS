import { useEffect, useRef, useState } from "react";
import { useChecklist } from "@/contexts/checklist-context";
import {
  emptyClosingPackageProgress,
  loadClosingPackageProgress,
  subscribeClosingPackageReset,
  subscribeClosingPackageProgress,
  updateClosingPackageProgress,
  type ClosingPackageProgress,
} from "@/lib/closing-package-progress";

/** The parent is keyed by loan ID; this state never follows another loan. */
export function useClosingPackage(loanId: string) {
  const { demoResetVersion, demoResetPending } = useChecklist();
  const [initial] = useState(() => {
    try {
      return { progress: loadClosingPackageProgress(loanId), error: null };
    } catch {
      return {
        progress: emptyClosingPackageProgress(),
        error: "Saved Closing Package progress could not be loaded. Reset Demo to clear it.",
      };
    }
  });
  const [progress, setProgress] = useState(initial.progress);
  const [error, setError] = useState<string | null>(initial.error);
  const progressRef = useRef(progress);
  const resetVersion = useRef(demoResetVersion);

  useEffect(() => subscribeClosingPackageReset(loanId, () => {
    const next = emptyClosingPackageProgress();
    // Invalidate the timer before React's next render/effect cleanup.
    progressRef.current = next;
    setProgress(next);
    setError(null);
  }), [loanId]);

  function refresh() {
    try {
      const next = loadClosingPackageProgress(loanId);
      progressRef.current = next;
      setProgress(next);
      setError(null);
    } catch {
      setError("Saved Closing Package progress could not be loaded. Reset Demo to clear it.");
    }
  }

  useEffect(() => {
    const unsubscribe = subscribeClosingPackageProgress(loanId, refresh);
    refresh();
    return unsubscribe;
  }, [loanId]);

  function save(update: (current: ClosingPackageProgress) => ClosingPackageProgress | null) {
    const failed = () => setError(
      "Closing Package progress could not be saved. Enable browser storage and try again or Reset Demo.",
    );
    try {
      const pending = updateClosingPackageProgress(loanId, update);
      if (pending) void pending.catch(failed);
    } catch {
      failed();
    }
  }

  useEffect(() => {
    if (resetVersion.current === demoResetVersion) return;
    resetVersion.current = demoResetVersion;
    // Disclosure-only resets also notify demo surfaces. Reload this loan's
    // package instead of erasing progress that the reset did not clear.
    refresh();
  }, [demoResetVersion, loanId]);

  useEffect(() => {
    if (!progress.generatingUntil || error) return;
    const dueAt = progress.generatingUntil;
    const operationId = progress.operationId;
    const timer = setTimeout(() => {
      // A reset may have cleared the operation before this effect's cleanup.
      if (progressRef.current.generatingUntil !== dueAt) return;
      save((current) => current.generatingUntil === dueAt && current.operationId === operationId
        ? { ...current, generatedAt: dueAt, generatingUntil: null }
        : null);
    }, Math.max(0, Date.parse(dueAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [progress.generatingUntil, progress.operationId, error, loanId]);

  return {
    generationState: progress.generatingUntil ? "generating" as const
      : progress.generatedAt ? "generated" as const : "idle" as const,
    lastGenerated: progress.generatedAt,
    lastDelivered: progress.deliveredAt,
    error,
    generate() {
      if (demoResetPending || progressRef.current.generatingUntil || error) return;
      const dueAt = new Date(Date.now() + 5000).toISOString();
      save((current) => current.generatingUntil ? null
        : { ...current, generatingUntil: dueAt, operationId: crypto.randomUUID() });
    },
    deliver() {
      if (demoResetPending || !progressRef.current.generatedAt || progressRef.current.generatingUntil || error) return;
      const deliveredAt = new Date().toISOString();
      const { generatedAt, operationId } = progressRef.current;
      save((current) => current.generatedAt === generatedAt && current.operationId === operationId &&
        !current.generatingUntil
        ? { ...current, deliveredAt }
        : null);
    },
  };
}