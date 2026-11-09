import { useEffect, useState, useSyncExternalStore, type ReactNode, type Dispatch, type SetStateAction, useRef } from "react";
import { applicationStore, applicationRequest } from "@/lib/loan-application-store";
import { Button } from "@/components/ui/button";
import { useLoanId } from "@/contexts/loan-id-context";

export function useApplicationStatus() {
  useSyncExternalStore(applicationStore.subscribe, applicationStore.snapshot);
  return applicationStore;
}

export function useLoanEditing(key: string, editing: boolean) {
  useEffect(() => {
    applicationStore.markDraft(key, editing);
    return () => applicationStore.markDraft(key, false);
  }, [key, editing]);
}

export function LoanApplicationProvider({ children }: { children: ReactNode }) {
  const id = useLoanId();
  const [loaded, setLoaded] = useState("");
  const [mount, setMount] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [remote, setRemote] = useState(false);
  const store = useApplicationStatus();
  const active = useRef(false);
  async function refresh() {
    if (!id) return;
    try {
      await store.flush();
      const next = await applicationRequest(id);
      if (active.current) {
        store.install(next); setLoaded(id); setLoadError(""); setRemote(false); setMount(n => n + 1);
      }
    } catch (error) { if (active.current) setLoadError((error as Error).message); }
  }
  useEffect(() => {
    let alive = true;
    active.current = true;
    if (!id) return;
    setLoaded(""); setLoadError("");
    // A direct route change (including browser Back/Forward) can arrive before
    // the old loan's last save completes. Do not install the next loan over it.
    store.flush().then(() => alive ? applicationRequest(id) : null).then(async next => {
      if (!alive || !next) return;
      store.install(next);
      // Preserve the first browser's already-saved prototype workflow data.
      // Never merge old local data back after a reset/import or a shared edit.
      if (next.mode === "existing" && next.revision === 0) {
        for (const prefix of ["loan-checklist-statuses", "loan-runtime-activity", "loan-closing-package", "loan-closing-disclosures", "loan-subject-property"]) {
          const key = `${prefix}:${id}`;
          const saved = window.localStorage.getItem(key);
          if (saved !== null) store.write(`storage:${key}`, saved);
        }
        await store.flush();
      }
      if (alive) { setLoaded(id); setMount(n => n + 1); }
    }).catch(error => { if (alive) setLoadError(error.message); });
    return () => { alive = false; active.current = false; };
  }, [id]);
  useEffect(() => {
    if (!id || loaded !== id) return;
    let alive = true;
    const timer = setInterval(async () => {
      if (store.pending || store.error) return;
      try {
        const next = await applicationRequest(id);
        if (!alive || store.pending || store.document?.loan.id !== id) return;
        if (next.revision > store.document.revision) {
          if (store.dirty) { setRemote(true); return; }
          store.install(next); setMount(n => n + 1);
        }
      } catch { /* Keep current data; explicit saves report their own errors. */ }
    }, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, [id, loaded]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (store.pending || store.error || store.dirty) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    const reset = () => setMount(n => n + 1);
    window.addEventListener("loan-application-replaced", reset);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("loan-application-replaced", reset); };
  }, []);
  if (loaded !== id) return <div role="status" className="min-h-[100dvh]" style={{ padding: "var(--roads-spacing-component-2xl)", background: "var(--roads-bg-page)" }} data-testid={loadError ? "error-state" : "loading-state"}>
    {loadError ? <><p role="alert">{loadError}</p><Button onClick={refresh}>Retry</Button></> :
      <div className="animate-pulse flex flex-col" style={{ gap: "var(--roads-spacing-component-xl)" }}>
        <span className="sr-only">Loading loan data…</span>
        {[0, 1, 2].map(n => <div key={n} style={{ height: "var(--roads-spacing-layout-xs)", background: "var(--roads-bg-light)" }} />)}
      </div>}
  </div>;
  return <>
    {(store.error || remote || loadError) && <div role="alert" className="p-3 bg-amber-100 text-black">
      {store.error || loadError || "This loan changed in another session. Your unsaved edits have not been replaced."}
      <Button variant="outline" onClick={() => {
        if (window.confirm("Discard unsaved changes and load the latest loan?"))
          store.flush().catch(() => {}).then(() => applicationRequest(id)).then(next => {
            if (!active.current) return;
            store.install(next); setRemote(false); setLoadError(""); setMount(n => n + 1);
          }).catch(error => { if (active.current) setLoadError(error.message); });
      }}>Reload latest loan</Button>
    </div>}
    {store.pending > 0 && <div role="status" className="fixed bottom-3 right-3 z-[100] rounded bg-white shadow px-3 py-2 text-sm">Saving loan data…</div>}
    <div key={`${id}:${mount}`} className="contents">{children}</div>
  </>;
}

/** Existing Edit/Save/Discard components use the third return value on Save. */
export function useLoanDraft<T>(key: string, initial: T, blank?: T, applicationData = true):
  [T, Dispatch<SetStateAction<T>>, (value?: T) => void] {
  const [value, setValue] = useState<T>(() => applicationStore.read(key, initial, blank, applicationData));
  const saved = useRef(value);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    applicationStore.markDraft(key, JSON.stringify(value) !== JSON.stringify(saved.current));
    return () => applicationStore.markDraft(key, false);
  }, [key, value]);
  return [value, setValue, (committed = latest.current) => {
    applicationStore.write(key, committed);
    saved.current = committed;
    applicationStore.markDraft(key, false);
  }];
}

/** For arrays/values whose setters are already called only after a committed edit. */
export function useLoanState<T>(key: string, initial: T, blank?: T, applicationData = true):
  [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => applicationStore.read(key, initial, blank, applicationData));
  const latest = useRef(value);
  latest.current = value;
  return [value, next => {
    const result = typeof next === "function" ? (next as (value: T) => T)(latest.current) : next;
    const durable = (key === "booking-state" && result === "booking") ||
      (key.endsWith("-generation") && result === "generating") ? "idle" : result;
    applicationStore.write(key, durable);
    latest.current = result; setValue(result);
  }];
}
