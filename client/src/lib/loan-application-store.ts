import { applicationView, emptyFields, type LoanApplication } from "@shared/loan-application";
import { queryClient } from "./queryClient";

let document: LoanApplication | null = null;
let queue = Promise.resolve();
let pending = 0;
let failure = "";
let version = 0;
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
    baselines.clear();
    document = next; failure = ""; drafts.clear();
    queryClient.setQueryData(["/api/loans", next.loan.id], applicationView(next));
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
    const baseline = baselines.get(key);
    // Update synchronously so existing read/modify/write stores see their own write.
    document.sections = { ...document.sections, [key]: value };
    pending++; notify();
    queue = queue.then(async () => {
      if (failure) throw new Error(failure);
      if (!document || document.loan.id !== loanId || document.generation !== generation)
        throw new Error("The active loan was replaced. Reload before saving.");
      const next = await applicationRequest(loanId, "", {
        method: "PUT", body: JSON.stringify({ section: key, value, baseline, generation, revision: document.revision }),
      });
      // Keep any newer queued optimistic values while acknowledging this revision.
      document = { ...next, sections: { ...next.sections, ...document.sections } };
      queryClient.setQueryData(["/api/loans", loanId], applicationView(document));
    }).catch(error => { failure = error.message; }).finally(() => { pending--; notify(); });
  },
  async flush() { await queue; if (failure) throw new Error(failure); },
};

export async function applicationRequest(id: string, suffix = "", options: RequestInit = {}): Promise<LoanApplication> {
  const response = await fetch(`/api/loans/${encodeURIComponent(id)}/application${suffix}`, {
    ...options, headers: { "Content-Type": "application/json", ...options.headers },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Loan data request failed.");
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
