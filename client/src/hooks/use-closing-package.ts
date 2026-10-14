import { useEffect, useRef, useState } from "react";
import { useChecklist } from "@/contexts/checklist-context";
import {
  closingPackageStorageKey,
  emptyClosingPackageProgress,
  loadClosingPackageProgress,
  type ClosingPackageProgress,
} from "@/lib/closing-package-progress";

/** The parent is keyed by loan ID; this state never follows another loan. */
export function useClosingPackage(loanId: string) {
  const { demoResetVersion } = useChecklist();
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

  function save(next: ClosingPackageProgress) {
    try {
      localStorage.setItem(closingPackageStorageKey(loanId), JSON.stringify(next));
      progressRef.current = next;
      setProgress(next);
      setError(null);
    } catch {
      setError("Closing Package progress could not be saved. Enable browser storage and try again or Reset Demo.");
    }
  }

  useEffect(() => {
    if (resetVersion.current === demoResetVersion) return;
    resetVersion.current = demoResetVersion;
    // Disclosure-only resets also notify demo surfaces. Reload this loan's
    // package instead of erasing progress that the reset did not clear.
    try {
      const next = loadClosingPackageProgress(loanId);
      progressRef.current = next;
      setProgress(next);
      setError(null);
    } catch {
      setError("Saved Closing Package progress could not be loaded. Reset Demo to clear it.");
    }
  }, [demoResetVersion, loanId]);

  useEffect(() => {
    if (!progress.generatingUntil || error) return;
    const dueAt = progress.generatingUntil;
    const timer = setTimeout(() => {
      // A reset may have cleared the operation before this effect's cleanup.
      if (progressRef.current.generatingUntil !== dueAt) return;
      save({ ...progressRef.current, generatedAt: dueAt, generatingUntil: null });
    }, Math.max(0, Date.parse(dueAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [progress.generatingUntil, error, loanId]);

  return {
    generationState: progress.generatingUntil ? "generating" as const
      : progress.generatedAt ? "generated" as const : "idle" as const,
    lastGenerated: progress.generatedAt,
    lastDelivered: progress.deliveredAt,
    error,
    generate() {
      if (progressRef.current.generatingUntil || error) return;
      save({ ...progressRef.current, generatingUntil: new Date(Date.now() + 5000).toISOString() });
    },
    deliver() {
      if (!progressRef.current.generatedAt || progressRef.current.generatingUntil || error) return;
      save({ ...progressRef.current, deliveredAt: new Date().toISOString() });
    },
  };
}