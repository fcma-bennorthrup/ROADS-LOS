import { useEffect, useRef, useState } from "react";
import { useChecklist } from "@/contexts/checklist-context";
import { localCalendarDate, withBorrowerDelivery, type DisclosureBorrower } from "@/lib/closing-disclosure-borrowers";
import {
  DisclosureWritesUnsupportedError,
  loadClosingDisclosureHistory,
  resetClosingDisclosureHistory,
  subscribeClosingDisclosureHistory,
  updateClosingDisclosureHistory,
  type ClosingDisclosureHistory,
} from "@/lib/closing-disclosure-history";

/** Mount with a loan-specific key so pending work never moves between loans. */
export function useClosingDisclosures(loanId: string) {
  const { demoResetVersion } = useChecklist();
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ClosingDisclosureHistory>(() => {
    try {
      return loadClosingDisclosureHistory(loanId);
    } catch {
      return { records: [], resetToken: null };
    }
  });
  const records = history.records;
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const resetPending = useRef(false);
  const historyRef = useRef(history);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetVersion = useRef(demoResetVersion);

  function cancelGeneration() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setGenerating(false);
  }

  function refresh(removed = false) {
    try {
      const next = loadClosingDisclosureHistory(loanId);
      if (removed || next.resetToken !== historyRef.current.resetToken) cancelGeneration();
      historyRef.current = next;
      setHistory(next);
      setError(null);
    } catch {
      cancelGeneration();
      setError("Saved disclosure history could not be loaded. Use Reset Closing Disclosure or Reset Demo to clear it.");
    }
  }

  useEffect(() => {
    const unsubscribe = subscribeClosingDisclosureHistory(loanId, refresh);
    refresh();
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [loanId]);

  useEffect(() => {
    if (resetVersion.current === demoResetVersion) return;
    resetVersion.current = demoResetVersion;
    cancelGeneration();
    refresh();
  }, [demoResetVersion]);

  function save(update: (current: ClosingDisclosureHistory) => ClosingDisclosureHistory) {
    const failed = (error: unknown) => {
      setError(error instanceof DisclosureWritesUnsupportedError ? error.message
        : "Disclosure history could not be saved. Please enable browser storage and try again.");
    };
    try {
      const result = updateClosingDisclosureHistory(loanId, update);
      if (result) void result.catch(failed);
    } catch (error) {
      failed(error);
    }
  }

  function generate() {
    if (timer.current || error || resetPending.current) return;
    const resetToken = historyRef.current.resetToken;
    setGenerating(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      save((current) => {
        if (current.resetToken !== resetToken) return current;
        const id = Math.max(0, ...current.records.map((record) => record.id)) + 1;
        if (!Number.isSafeInteger(id)) throw new Error("Disclosure IDs exhausted");
        return { ...current, records: [
          { id, generatedAt: new Date().toISOString(), deliveredAt: null },
          ...current.records,
        ] };
      });
      setGenerating(false);
    }, 5000);
  }

  function deliver(id: number, borrowers: readonly DisclosureBorrower[] = []) {
    const record = historyRef.current.records.find((row) => row.id === id);
    if (!record || record.deliveredAt || error || resetPending.current) return;
    const resetToken = historyRef.current.resetToken;
    const generatedAt = record.generatedAt;
    const clickedAt = new Date();
    const deliveredAt = clickedAt.toISOString();
    const deliveryDate = localCalendarDate(clickedAt);
    const borrowerIds = borrowers.map((borrower) => borrower.id);
    save((current) => current.resetToken !== resetToken ? current : {
      ...current,
      records: current.records.map((row) =>
        row.id === id && row.generatedAt === generatedAt && !row.deliveredAt
          ? withBorrowerDelivery(row, borrowerIds, deliveredAt, deliveryDate)
          : row,
      ),
    });
  }

  function reset() {
    if (resetPending.current) return;
    resetPending.current = true;
    setResetting(true);
    const finish = () => {
      resetPending.current = false;
      setResetting(false);
    };
    const failed = (error: unknown) => {
      setError(error instanceof DisclosureWritesUnsupportedError ? error.message
        : "Closing Disclosure could not be reset. Saved history has not been cleared. Enable browser storage and try again.");
      finish();
    };
    try {
      // The persisted reset identity cancels pending work in every consumer,
      // including tabs whose storage notification has not arrived yet.
      const result = resetClosingDisclosureHistory(loanId, true);
      if (result) void result.then(finish, failed);
      else finish();
    } catch (error) {
      failed(error);
    }
  }

  return { records, generating, resetting, error, generate, deliver, reset };
}