import { act, render, renderHook, screen, fireEvent } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { useClosingDisclosures } from "@/hooks/use-closing-disclosures";
import {
  DISCLOSURE_WRITES_UNSUPPORTED, closingDisclosureStorageKey,
  loadClosingDisclosureHistory, updateClosingDisclosureHistory, resetClosingDisclosureHistory,
} from "@/lib/closing-disclosure-history";
import { beginDisclosureEdit, saveDisclosureBorrowers, blankBorrowerDetails } from "@/lib/closing-disclosure-borrowers";
import { Toaster } from "@/components/ui/toaster";

const key = closingDisclosureStorageKey("prototype");
const row = { id: 1, generatedAt: "2026-10-14T12:00:00.000Z", deliveredAt: null };
const saved = JSON.stringify([row]);
beforeEach(() => {
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  localStorage.setItem(key, saved);
});

it.each([undefined, {}, { request: null }])("refuses unsupported writes before reads, mutation, commits or notifications: %j", (locks) => {
  Object.defineProperty(navigator, "locks", { configurable: true, value: locks });
  const read = vi.spyOn(Storage.prototype, "getItem");
  const write = vi.spyOn(Storage.prototype, "setItem");
  const notify = vi.spyOn(window, "dispatchEvent");
  const update = vi.fn();
  const commit = vi.fn();
  expect(() => updateClosingDisclosureHistory("prototype", update, false, undefined, commit))
    .toThrow(DISCLOSURE_WRITES_UNSUPPORTED);
  expect(() => resetClosingDisclosureHistory("prototype", true, undefined, commit))
    .toThrow(DISCLOSURE_WRITES_UNSUPPORTED);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
  expect(commit).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  expect(localStorage.getItem(key)).toBe(saved);
  expect(loadClosingDisclosureHistory("prototype").records).toEqual([row]);
});

it.each(["generate", "deliver", "reset"] as const)("surfaces unsupported %s without changing saved or visible history", async (action) => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useClosingDisclosures("prototype"), { wrapper: ChecklistProvider });
  await act(async () => {
    if (action === "generate") {
      result.current.generate();
      vi.advanceTimersByTime(5000);
    } else if (action === "deliver") result.current.deliver(1);
    else result.current.reset();
  });
  expect(result.current.error).toBe(DISCLOSURE_WRITES_UNSUPPORTED);
  expect(result.current.records).toEqual([row]);
  expect(result.current.generating).toBe(false);
  expect(result.current.resetting).toBe(false);
  expect(localStorage.getItem(key)).toBe(saved);
  vi.useRealTimers();
});

it("retains borrower drafts and legacy bytes when saving is unsupported", async () => {
  const snapshot = beginDisclosureEdit("prototype", 1);
  const draft = [{ ...blankBorrowerDetails("synthetic"), cdViewed: "Yes" as const }];
  const before = JSON.stringify(draft);
  await expect(saveDisclosureBorrowers("prototype", snapshot, draft)).rejects.toThrow(DISCLOSURE_WRITES_UNSUPPORTED);
  expect(JSON.stringify(draft)).toBe(before);
  expect(localStorage.getItem(key)).toBe(saved);
});

it("does not replace corrupt history through an unsupported reset", () => {
  localStorage.setItem(key, "corrupt");
  expect(() => resetClosingDisclosureHistory("prototype")).toThrow(DISCLOSURE_WRITES_UNSUPPORTED);
  expect(localStorage.getItem(key)).toBe("corrupt");
});

it("reports partial Reset Demo without clearing disclosure, checklist or activity", async () => {
  let outcome: unknown;
  const activity = vi.fn();
  function Controls() {
    const { resetDemoTasks, completeAction, getActionStatus } = useChecklist();
    return <>
      <button onClick={() => completeAction("Closing Disclosure", 0)}>Complete</button>
      <button onClick={async () => { outcome = await resetDemoTasks(["Closing Package", "Closing Disclosure"], activity); }}>Reset</button>
      <output>{getActionStatus("Closing Disclosure", 0)}</output>
    </>;
  }
  localStorage.setItem("loan-closing-package:prototype", JSON.stringify({
    generatedAt: row.generatedAt, deliveredAt: null, generatingUntil: null,
  }));
  render(<ChecklistProvider><Controls /><Toaster /></ChecklistProvider>);
  fireEvent.click(screen.getByText("Complete"));
  await act(async () => { fireEvent.click(screen.getByText("Reset")); });
  expect(outcome).toMatchObject({ outcome: "incomplete", cleared: expect.arrayContaining(["Closing Package"]),
    notCleared: ["Closing Disclosure", "Checklist", "Loan Activity"] });
  expect(localStorage.getItem("loan-closing-package:prototype")).toBeNull();
  expect(localStorage.getItem(key)).toBe(saved);
  expect(screen.getByText("complete")).toBeInTheDocument();
  expect(screen.getAllByText(new RegExp("Web Locks are unavailable")).length).toBeGreaterThan(0);
  expect(activity).not.toHaveBeenCalled();
});
