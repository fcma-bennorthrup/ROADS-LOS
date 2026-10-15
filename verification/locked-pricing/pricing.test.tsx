import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { LoanActivityProvider, useActivityPanel } from "@/contexts/loan-activity-context";
import { ProductPricingContent } from "@/components/loan/ProductPricingContent";
import { LOCKED_PRICING_FIELD as field, parseLockedPricing } from "@/lib/locked-pricing";
import { closingDisclosureStorageKey, resetClosingDisclosureHistory } from "@/lib/closing-disclosure-history";
import { click, choose, change } from "../origination/helpers";
import { toast } from "@/hooks/use-toast";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }), toast: vi.fn(), dismissToasts: vi.fn() }));
let checklist: ReturnType<typeof useChecklist>;
let activity: ReturnType<typeof useActivityPanel>;
const key = "loan-checklist-statuses:one";
const stored = () => JSON.parse(localStorage.getItem(key)!);
function Content() {
  checklist = useChecklist();
  activity = useActivityPanel();
  const [visible, setVisible] = useState(true);
  return <>
    <button onClick={() => setVisible(v => !v)}>Section</button>
    {visible && <ProductPricingContent loanNumber="TEST" borrowerName="Synthetic Borrower" />}
  </>;
}
function mount() {
  const location = memoryLocation({ path: "/loans/one/origination" });
  const view = render(<Router hook={location.hook}><LoanActivityProvider><ChecklistProvider>
    <Content />
  </ChecklistProvider></LoanActivityProvider></Router>);
  return { ...view, navigate: location.navigate };
}
const toggle = () => fireEvent.click(screen.getByText("Section"));
const lock = () => { click("button-lock-rate"); click("button-confirm-lock-rate"); };
const reset = () => act(() => { checklist.resetDemoTasks(checklist.tasks.map(t => t.name)); });
function deny(name: string) {
  const original = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(k, value) {
    if (k === name) throw new Error("Synthetic denied write");
    return original.call(this, k, value);
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const products = [
  ["arm", "4251", "6.250%", "6.900%"], ["arm", "4243", "6.370%", "7.020%"],
  ["arm", "4245", "6.500%", "7.150%"], ["arm", "4247", "6.500%", "7.150%"],
  ["arm", "4240", "6.500%", "7.150%"], ["arm", "4242", "6.750%", "7.400%"],
  ["fixed", "4370", "6.125%", "6.775%"], ["fixed", "4371", "6.375%", "7.025%"],
  ["fixed", "4372", "6.625%", "7.275%"], ["fixed", "4373", "6.750%", "7.400%"],
  ["fixed", "4374", "6.750%", "7.400%"],
];
describe("approved locked pricing snapshot", () => {
  it.each(products)("retains %s %s unsaved blank terms and exact rates across remount/reload", (type, id, base, final) => {
    let view = mount();
    click("button-edit-product");
    choose("select-product-type", type); choose("select-product", id);
    change("input-term-months-", "");
    lock();
    expect(stored()[field].termOverride).toBe("");
    toggle(); toggle();
    view.unmount(); view = mount();
    expect(screen.getByTestId("form-field-product")).toHaveTextContent(id);
    expect(screen.getByTestId("form-field-term-months-").textContent).toBe("Term (Months)\u00a0");
    expect(screen.getByTestId("text-base-rate")).toHaveTextContent(base);
    expect(screen.getByTestId("text-final-rate")).toHaveTextContent(final);
    expect(screen.getByTestId("button-edit-product")).toBeDisabled();
    expect(screen.getByTestId("button-lock-rate")).toHaveTextContent("Update Rate Lock");
  });
  it("retains custom terms and confirmed expiration, discards cancellation, isolates loans and deduplicates activity", () => {
    const view = mount();
    act(() => checklist.setActionStatus("Loan Estimate", 0, "complete"));
    act(() => checklist.setActionStatus("Loan Estimate", 1, "complete"));
    click("button-edit-product"); choose("select-product", "4374"); change("input-term-months-", "arbitrary term");
    lock();
    expect(checklist.getActionStatus("Loan Estimate", 0)).toBe("re-fire");
    act(() => checklist.setActionStatus("Loan Estimate", 0, "complete"));
    act(() => checklist.setActionStatus("Loan Estimate", 1, "complete"));
    click("button-lock-rate");
    change("input-lock-date", "12/31/2030");
    click("button-confirm-lock-rate");
    const snapshot = stored()[field];
    expect(snapshot.expiration).toBe("12/31/2030");
    expect(checklist.getActionStatus("Loan Estimate", 0)).toBe("re-fire");
    expect(checklist.getActionStatus("Loan Estimate", 1)).toBe("not-started");
    expect(JSON.stringify(snapshot)).not.toContain("Synthetic Borrower");
    click("button-lock-rate");
    change("input-lock-date", "cancelled text");
    click("button-cancel-lock");
    expect(stored()[field]).toEqual(snapshot);
    act(() => view.navigate("/loans/two/origination"));
    expect(screen.getByTestId("button-lock-rate")).toHaveTextContent("Lock Rate");
    expect(screen.queryByTestId("icon-rate-locked")).not.toBeInTheDocument();
    act(() => view.navigate("/loans/one/origination"));
    expect(screen.getByTestId("form-field-term-months-")).toHaveTextContent("arbitrary term");
    click("button-lock-rate");
    expect(screen.getByTestId("input-lock-date")).toHaveValue("12/31/2030");
    click("button-confirm-lock-rate");
    expect(activity.activityItems.filter(item => item.id === "rate-lock")).toHaveLength(1);
  });
  it.each([undefined, {}, { version: 99 }, "corrupt"])("does not invent terms for a complete legacy/corrupt lock %j", value => {
    localStorage.setItem(key, JSON.stringify({ "Rate Lock": ["complete", "complete", "complete"], [field]: value }));
    mount();
    expect(screen.getByRole("alert")).toHaveTextContent("Locked pricing terms unavailable. Reset Demo to start again.");
    expect(screen.getByTestId("text-final-rate")).toHaveTextContent("—");
    expect(screen.getByTestId("button-lock-rate")).toBeDisabled();
    expect(screen.getByTestId("button-edit-product")).toBeDisabled();
    expect(checklist.getActionStatus("Rate Lock", 0)).toBe("complete");
    expect(screen.getByTestId("button-generate-rate-lock-letter")).toBeEnabled();
    reset();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    lock();
    expect(stored()[field]).toBeTruthy();
  });
  it.each([false, true])("denied save leaves previous lock and downstream effects untouched, already locked=%s", already => {
    mount();
    if (already) lock();
    act(() => checklist.setActionStatus("Loan Estimate", 0, "complete"));
    act(() => checklist.setActionStatus("Loan Estimate", 1, "complete"));
    const before = localStorage.getItem(key);
    const activityBefore = activity.activityItems;
    const spy = deny(key);
    click("button-lock-rate");
    if (already) change("input-lock-date", "12/31/2030");
    click("button-confirm-lock-rate");
    expect(localStorage.getItem(key)).toBe(before);
    expect(checklist.getActionStatus("Rate Lock", 0)).toBe(already ? "complete" : "not-started");
    expect(checklist.getActionStatus("Loan Estimate", 0)).toBe("complete");
    expect(activity.activityItems).toEqual(activityBefore);
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({
      description: "Rate lock could not be saved. Enable browser storage and try again.",
    }));
    spy.mockRestore();
  });
  it("keeps pricing when a partial reset fails, clears on successful checklist reset while absent, and permits relock", () => {
    mount(); lock();
    const snapshot = stored()[field];
    const fail = deny(closingDisclosureStorageKey("one"));
    reset();
    expect(stored()[field]).toEqual(snapshot);
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();
    fail.mockRestore();
    toggle(); reset();
    expect(stored()[field]).toBeUndefined();
    toggle(); lock(); toggle(); toggle();
    expect(screen.getByTestId("icon-rate-locked")).toBeInTheDocument();
  });
  it("keeps pricing if the checklist reset write is denied and preserves disclosure-only isolation", () => {
    mount(); lock();
    const snapshot = stored()[field];
    const fail = deny(key);
    reset();
    expect(stored()[field]).toEqual(snapshot);
    fail.mockRestore();
    act(() => { resetClosingDisclosureHistory("one", true); });
    expect(stored()[field]).toEqual(snapshot);
  });
  it("restores captured rates rather than repricing from the current catalog, rejects inconsistent numbers", () => {
    const view = mount(); lock();
    const record = stored();
    record[field].baseRate = 4;
    record[field].finalRate = 4.65;
    view.unmount();
    localStorage.setItem(key, JSON.stringify(record));
    mount();
    expect(screen.getByTestId("text-base-rate")).toHaveTextContent("4.000%");
    expect(screen.getByTestId("text-final-rate")).toHaveTextContent("4.650%");
    expect(parseLockedPricing({ ...record[field], finalRate: 500 })).toBeNull();
    expect(parseLockedPricing({ ...record[field], catalogTerm: -1 })).toBeNull();
    expect(parseLockedPricing({ ...record[field], productId: "unknown" })).toBeNull();
    expect(parseLockedPricing({ ...record[field], baseRate: Infinity })).toBeNull();
  });
  it("does not claim known terms if reading the snapshot is denied after checklist status loads", () => {
    localStorage.setItem(key, JSON.stringify({ "Rate Lock": ["complete"] }));
    const original = Storage.prototype.getItem;
    let reads = 0;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(function(name) {
      if (name === key && ++reads > 1) throw new Error("Synthetic snapshot read denied");
      return original.call(this, name);
    });
    mount();
    expect(screen.getByRole("alert")).toHaveTextContent("Locked pricing terms unavailable.");
    expect(screen.getByTestId("button-lock-rate")).toBeDisabled();
  });
  it("clears snapshot when checklist reset succeeds even if later activity reset fails", () => {
    mount(); lock();
    let outcome: unknown;
    act(() => {
      outcome = checklist.resetDemoTasks(checklist.tasks.map(t => t.name), () => {
        throw new Error("Synthetic activity failure");
      });
    });
    expect(outcome).toMatchObject({ outcome: "incomplete", cleared: expect.arrayContaining(["Checklist"]) });
    expect(stored()[field]).toBeUndefined();
    expect(screen.queryByTestId("icon-rate-locked")).not.toBeInTheDocument();
  });
});
