import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useClosingPackage } from "@/hooks/use-closing-package";
import {
  closingPackageStorageKey as key, loadClosingPackageProgress as load,
  resetClosingPackageProgress as reset, updateClosingPackageProgress as update,
} from "@/lib/closing-package-progress";

vi.mock("@/contexts/checklist-context", () => ({
  useChecklist: () => ({ demoResetVersion: 0, demoResetPending: false }),
}));

const start = "2026-10-14T16:00:00.000Z";
const due = "2026-10-14T16:00:05.000Z";
const delivered = "2026-10-14T16:00:06.000Z";
const hook = (id = "one") => renderHook(() => useClosingPackage(id));
const seed = (value: object, id = "one") => localStorage.setItem(key(id), JSON.stringify(value));
const event = (id: string | null = "one") => window.dispatchEvent(new StorageEvent("storage", {
  key: id === null ? null : key(id), storageArea: localStorage,
  // Deliberately stale payload: subscribers must read storage instead.
  newValue: JSON.stringify({ generatedAt: start, deliveredAt: null, generatingUntil: null }),
}));
function queueLocks() {
  const queue: Array<(fail?: boolean) => void> = [];
  Object.defineProperty(navigator, "locks", { configurable: true, value: {
    request: vi.fn((_key: string, write: () => void) => new Promise<void>((resolve, reject) => {
      queue.push((fail) => {
        try { if (fail) throw new Error("lock denied"); write(); resolve(); }
        catch (error) { reject(error); }
      });
    })),
  } });
  return queue;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(start));
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
});

it("preserves A delivery when an unnotified stale B starts generation", () => {
  const b = hook();
  seed({ generatedAt: due, deliveredAt: delivered, generatingUntil: null });
  act(() => b.result.current.generate());
  expect(load("one")).toMatchObject({ generatedAt: due, deliveredAt: delivered, generatingUntil: due });
  act(() => vi.advanceTimersByTime(5000));
  expect(b.result.current.lastDelivered).toBe(delivered);
});

it("updates same-window consumers and keeps the first competing deadline", () => {
  const a = hook(), b = hook(), other = hook("two");
  act(() => a.result.current.generate());
  expect(b.result.current.generationState).toBe("generating");
  act(() => { vi.advanceTimersByTime(1000); b.result.current.generate(); });
  expect(load("one").generatingUntil).toBe(due);
  act(() => vi.advanceTimersByTime(4000));
  act(() => a.result.current.deliver());
  expect(b.result.current.lastGenerated).toBe(due);
  expect(b.result.current.lastDelivered).toBe(due);
  expect(other.result.current.generationState).toBe("idle");
});

it("rereads a differing deadline at timer commit before a storage notification", () => {
  const a = hook();
  act(() => a.result.current.generate());
  const later = "2026-10-14T16:00:10.000Z";
  seed({ generatedAt: null, deliveredAt: null, generatingUntil: later, operationId: "replacement" });
  act(() => vi.advanceTimersByTime(5000));
  expect(load("one").generatedAt).toBeNull();
  expect(a.result.current.generationState).toBe("generating");
  act(() => vi.advanceTimersByTime(5000));
  expect(a.result.current.lastGenerated).toBe(later);
});

it("does not recreate a removed package when its timer fires before notification", () => {
  const a = hook();
  act(() => a.result.current.generate());
  localStorage.removeItem(key("one"));
  act(() => vi.advanceTimersByTime(5000));
  expect(localStorage.getItem(key("one"))).toBeNull();
  expect(a.result.current.generationState).toBe("idle");
});

it("rejects queued completion of a replacement with the same deadline", async () => {
  const a = hook();
  act(() => a.result.current.generate());
  const queue = queueLocks();
  act(() => vi.advanceTimersByTime(5000));
  seed({ generatedAt: null, deliveredAt: null, generatingUntil: due, operationId: "new-generation" });
  await act(async () => queue.shift()!());
  expect(load("one").generatedAt).toBeNull();
  expect(load("one").operationId).toBe("new-generation");
});

it("reset invalidates queued starts and queued completions without altering another loan", async () => {
  const a = hook();
  seed({ generatedAt: start, deliveredAt: null, generatingUntil: null }, "two");
  const queue = queueLocks();
  act(() => a.result.current.generate());
  act(() => reset("one"));
  await act(async () => queue.shift()!());
  expect(localStorage.getItem(key("one"))).toBeNull();
  act(() => a.result.current.generate());
  await act(async () => queue.shift()!());
  act(() => vi.advanceTimersByTime(5000));
  act(() => reset("one"));
  await act(async () => queue.shift()!());
  expect(localStorage.getItem(key("one"))).toBeNull();
  expect(load("two").generatedAt).toBe(start);
});

it("serializes two queued starts and preserves delivery during regeneration", async () => {
  seed({ generatedAt: start, deliveredAt: delivered, generatingUntil: null });
  const a = hook(), b = hook();
  const queue = queueLocks();
  act(() => a.result.current.generate());
  vi.advanceTimersByTime(1000);
  act(() => b.result.current.generate());
  await act(async () => { queue.shift()!(); queue.shift()!(); });
  expect(load("one")).toMatchObject({ generatingUntil: due, deliveredAt: delivered });
  expect(a.result.current.lastDelivered).toBe(delivered);
  expect(b.result.current.generationState).toBe("generating");
});

it("rereads storage on notifications and ignores unrelated loans and session storage", () => {
  const a = hook();
  seed({ generatedAt: start, deliveredAt: delivered, generatingUntil: null });
  act(() => event("two"));
  expect(a.result.current.generationState).toBe("idle");
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: key("one"), storageArea: sessionStorage })));
  expect(a.result.current.generationState).toBe("idle");
  act(() => event());
  expect(a.result.current.lastDelivered).toBe(delivered);
  localStorage.clear();
  act(() => event(null));
  expect(a.result.current.generationState).toBe("idle");
});

it("failed writes do not publish optimistic state to either consumer", () => {
  const a = hook(), b = hook();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
  act(() => a.result.current.generate());
  expect(a.result.current.error).toContain("could not be saved");
  expect(a.result.current.generationState).toBe("idle");
  expect(b.result.current.error).toBeNull();
  expect(localStorage.getItem(key("one"))).toBeNull();
});

it("lock rejection preserves saved progress and reports the existing save error", async () => {
  seed({ generatedAt: start, deliveredAt: null, generatingUntil: null });
  const a = hook(), queue = queueLocks();
  act(() => a.result.current.deliver());
  await act(async () => queue.shift()!(true));
  expect(a.result.current.error).toContain("could not be saved");
  expect(load("one").deliveredAt).toBeNull();
  expect(a.result.current.generationState).toBe("generated");
});

it("notification read failure keeps last good progress and never overwrites invalid bytes", () => {
  seed({ generatedAt: start, deliveredAt: null, generatingUntil: null });
  const a = hook();
  localStorage.setItem(key("one"), "invalid");
  act(() => event());
  expect(a.result.current.error).toContain("could not be loaded");
  expect(a.result.current.lastGenerated).toBe(start);
  expect(localStorage.getItem(key("one"))).toBe("invalid");
});

it("supports legacy deadlines, due-time completion, repeat delivery and retained delivery", () => {
  seed({ generatedAt: start, deliveredAt: delivered, generatingUntil: due });
  const a = hook();
  act(() => vi.advanceTimersByTime(8000));
  expect(a.result.current.lastGenerated).toBe(due);
  expect(a.result.current.lastDelivered).toBe(delivered);
  act(() => a.result.current.deliver());
  const first = a.result.current.lastDelivered;
  act(() => vi.advanceTimersByTime(1000));
  act(() => a.result.current.deliver());
  expect(a.result.current.lastDelivered).not.toBe(first);
  act(() => a.result.current.generate());
  expect(a.result.current.lastDelivered).toBe("2026-10-14T16:00:09.000Z");
});

it("failed reset removal leaves the active operation intact", () => {
  const a = hook();
  act(() => a.result.current.generate());
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
  expect(() => reset("one")).toThrow("denied");
  act(() => vi.advanceTimersByTime(5000));
  expect(a.result.current.lastGenerated).toBe(due);
});

it("a no-op authoritative update refreshes the caller without writing", () => {
  const a = hook();
  seed({ generatedAt: start, deliveredAt: null, generatingUntil: null });
  const write = vi.spyOn(Storage.prototype, "setItem");
  act(() => update("one", () => null));
  expect(a.result.current.lastGenerated).toBe(start);
  expect(write).not.toHaveBeenCalled();
});

it("a queued start cannot restore a remotely removed completed package before notification", async () => {
  seed({ generatedAt: start, deliveredAt: delivered, generatingUntil: null });
  const a = hook(), queue = queueLocks();
  act(() => a.result.current.generate());
  localStorage.removeItem(key("one"));
  await act(async () => queue.shift()!());
  expect(localStorage.getItem(key("one"))).toBeNull();
  expect(a.result.current.generationState).toBe("idle");
});

it("late lock rejection after successful reset does not restore a stale error", async () => {
  const a = hook(), queue = queueLocks();
  act(() => a.result.current.generate());
  act(() => reset("one"));
  await act(async () => queue.shift()!(true));
  expect(a.result.current.error).toBeNull();
  expect(a.result.current.generationState).toBe("idle");
});
