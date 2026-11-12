import { applicationView, emptyFields, type LoanApplication } from "@shared/loan-application";
import { queryClient } from "./queryClient";
import { apiRequest } from "./queryClient";
import type { LoanStage } from "@shared/loan-stages";

let document: LoanApplication | null = null;
let queue = Promise.resolve();
let pending = 0;
let failure = "";
let version = 0;
let epoch = 0;
const listeners = new Set<() => void>();
const drafts = new Set<string>();
const baselines = new Map<string, unknown>();
function notify() { version++; listeners.forEach(fn => fn()); }
export const applicationStore = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  snapshot: () => version,
  get document() { return document; },
  get pending() { return pending; },
  get error() { return failure; },
  get dirty() { return drafts.size > 0; },
  markDraft(key: string, dirty: boolean) { dirty ? drafts.add(key) : drafts.delete(key); },
  install(next: LoanApplication) {
    epoch++;
    baselines.clear();
    document = next; failure = ""; drafts.clear();
    queryClient.setQueryData(["/api/loans", next.loan.id], applicationView(next));
    void queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
    notify();
  },
  read<T>(key: string, initial: T, blank?: T, applicationData = true): T {
    if (!document) return initial;
    if (Object.hasOwn(document.sections, key)) return document.sections[key] as T;
    if (document.mode === "empty" || (!applicationData && (document.mode === "blend" || document.sections["checklist-reset"] === true))) {
      const value = blank === undefined ? emptyFields(initial) : blank;
      baselines.set(key, value);
      return value;
    }
    baselines.set(key, initial);
    return initial;
  },
  write(key: string, value: unknown) {
    if (!document) return;
    if (failure) throw new Error(failure);
    if (Object.hasOwn(document.sections, key) &&
        JSON.stringify(document.sections[key]) === JSON.stringify(value)) return;
    const generation = document.generation;
    const loanId = document.loan.id;
    const installedEpoch = epoch;
    const baseline = baselines.get(key);
    // Update synchronously so existing read/modify/write stores see their own write.
    document.sections = { ...document.sections, [key]: value };
    pending++; notify();
    queue = queue.then(async () => {
      if (failure) throw new Error(failure);
      if (!document || epoch !== installedEpoch || document.loan.id !== loanId || document.generation !== generation)
        throw new Error("The active loan was replaced. Reload before saving.");
      const next = await applicationRequest(loanId, "", {
        method: "PUT", body: JSON.stringify({ section: key, value, baseline, generation, revision: document.revision }),
      });
      if (epoch !== installedEpoch || document?.loan.id !== loanId) return;
      // Keep any newer queued optimistic values while acknowledging this revision.
      const stageChanged = document?.loan.stage !== next.loan.stage;
      document = { ...next, sections: { ...next.sections, ...document.sections } };
      queryClient.setQueryData(["/api/loans", loanId], applicationView(document));
      if (stageChanged) void queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
    }).catch(error => { if (epoch === installedEpoch) failure = error.message; }).finally(() => { pending--; notify(); });
  },
  withdraw() {
    if (!document) return Promise.reject(new Error("No active loan."));
    const loanId = document.loan.id;
    const installedEpoch = epoch;
    pending++; notify();
    const operation = queue.then(async () => {
      if (failure) throw new Error(failure);
      if (!document || epoch !== installedEpoch || document.loan.id !== loanId)
        throw new Error("The active loan was replaced. Reload before saving.");
      const next = await applicationRequest(loanId, "", {
        method: "PUT", body: JSON.stringify({
          section: "withdrawal", value: { acknowledged: true },
          generation: document.generation, revision: document.revision,
        }),
      });
      if (epoch !== installedEpoch || document?.loan.id !== loanId) return;
      // Acknowledge only withdrawal; retain other queued sections and open drafts.
      document = { ...next, sections: { ...next.sections, ...document.sections, withdrawal: { acknowledged: true } } };
      queryClient.setQueryData(["/api/loans", loanId], applicationView(document));
    }).finally(() => { pending--; notify(); });
    queue = operation.catch(() => {});
    return operation;
  },
  changeStage(stage: LoanStage) {
    if (!document) return Promise.reject(new Error("No active loan."));
    const loanId = document.loan.id;
    const installedEpoch = epoch;
    pending++; notify();
    const operation = queue.then(async () => {
      if (failure) throw new Error(failure);
      if (!document || document.loan.id !== loanId || epoch !== installedEpoch)
        throw new Error("The active loan was replaced. Reload before saving.");
      const response = await apiRequest("PUT", `/api/loans/${encodeURIComponent(loanId)}/stage`, {
        stage, generation: document.generation, revision: document.revision,
      });
      const next: LoanApplication = await response.json();
      if (epoch !== installedEpoch || document?.loan.id !== loanId) return;
      // Stage acknowledges only a header change. Never install here: it clears
      // open drafts and can erase section edits queued while this request ran.
      document = { ...next, sections: { ...next.sections, ...document.sections } };
      queryClient.setQueryData(["/api/loans", loanId], applicationView(document));
      void queryClient.invalidateQueries({ queryKey: ["/api/loans"], exact: true });
    });
    queue = operation.catch(error => {
      if (epoch === installedEpoch) failure = error.message;
    }).finally(() => { pending--; notify(); });
    return operation;
  },
  async flush() {
    // A save can be queued while an earlier network request is being drained.
    // Leaving must await that tail too, not just the original promise.
    let tail: Promise<void>;
    do { tail = queue; await tail; } while (tail !== queue);
    if (failure) throw new Error(failure);
  },
};

export async function applicationRequest(id: string, suffix = "", options: RequestInit = {}): Promise<LoanApplication> {
  const response = await fetch(`/api/loans/${encodeURIComponent(id)}/application${suffix}`, {
    ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options.headers },
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || "Loan data request failed."), { code: result.code });
  return result;
}

/** Compatibility adapter for the existing loan-scoped workflow stores.
 * Browser storage remains a fallback only for isolated component tests.
 * The live application is gated on the database snapshot before mounting.
 */
export const loanStorage = {
  getItem(key: string): string | null {
    if (!document) return window.localStorage.getItem(key);
    if (!key.endsWith(`:${document.loan.id}`)) return null;
    return (document.sections[`storage:${key}`] as string | null) ?? null;
  },
  setItem(key: string, value: string) {
    if (!document) return window.localStorage.setItem(key, value);
    if (!key.endsWith(`:${document.loan.id}`)) throw new Error("This loan is no longer active.");
    applicationStore.write(`storage:${key}`, value);
  },
  removeItem(key: string) {
    if (!document) return window.localStorage.removeItem(key);
    if (!key.endsWith(`:${document.loan.id}`)) throw new Error("This loan is no longer active.");
    applicationStore.write(`storage:${key}`, null);
  },
};
