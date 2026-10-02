import { useEffect, useRef, useState } from "react";
import { useChecklist } from "@/contexts/checklist-context";
import {
  closingDisclosureStorageKey,
  loadClosingDisclosures,
  type ClosingDisclosureRecord,
} from "@/lib/closing-disclosure-history";

/** Mount with a loan-specific key so pending work never moves between loans. */
export function useClosingDisclosures(loanId: string) {
  const { demoResetVersion } = useChecklist();
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ClosingDisclosureRecord[]>(() => {
    try {
      return loadClosingDisclosures(loanId);
    } catch {
      return [];
    }
  });
  const [generating, setGenerating] = useState(false);
  const recordsRef = useRef(records);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetVersion = useRef(demoResetVersion);

  useEffect(() => {
    // Report unreadable history without overwriting it with an empty array.
    try {
      loadClosingDisclosures(loanId);
    } catch {
      setError("Saved disclosure history could not be loaded. Reset Demo to clear it.");
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [loanId]);

  useEffect(() => {
    if (resetVersion.current === demoResetVersion) return;
    resetVersion.current = demoResetVersion;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setGenerating(false);
    setRecords([]);
    recordsRef.current = [];
    setError(null);
  }, [demoResetVersion]);

  function save(next: ClosingDisclosureRecord[]) {
    try {
      localStorage.setItem(closingDisclosureStorageKey(loanId), JSON.stringify(next));
      setRecords(next);
      recordsRef.current = next;
      setError(null);
    } catch {
      setError("Disclosure history could not be saved. Please enable browser storage and try again.");
    }
  }

  function generate() {
    if (timer.current || error) return;
    setGenerating(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      const current = recordsRef.current;
      const id = Math.max(0, ...current.map((record) => record.id)) + 1;
      save([{ id, generatedAt: new Date().toISOString(), deliveredAt: null }, ...current]);
      setGenerating(false);
    }, 5000);
  }

  function deliver(id: number) {
    const record = recordsRef.current.find((row) => row.id === id);
    if (!record || record.deliveredAt || error) return;
    save(recordsRef.current.map((row) =>
      row.id === id ? { ...row, deliveredAt: new Date().toISOString() } : row,
    ));
  }

  return { records, generating, error, generate, deliver };
}