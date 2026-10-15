import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { DecisioningSummaryContent } from "@/components/loan/DecisioningSummaryContent";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { resetClosingDisclosureHistory } from "@/lib/closing-disclosure-history";

const restored = process.env.RESTORATION_PHASE !== "baseline";
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }), toast, dismissToasts: vi.fn() }));
const key = (id = "fixture-a") => `loan-checklist-statuses:${id}`;
const click = (id: string) => fireEvent.click(screen.getByTestId(id));
function Fixture() {
  const [visible, setVisible] = useState(true);
  const { resetDemoTasks, tasks } = useChecklist();
  return <>
    <button onClick={() => setVisible(!visible)}>Toggle summary</button>
    <button onClick={() => resetDemoTasks(["Loan Decision", "Decision Letter"])}>Reset fixture</button>
    <button onClick={() => resetDemoTasks(["Loan Decision", "Decision Letter", "Closing Package", "Closing Disclosure"])}>Reset full fixture</button>
    <output data-testid="tasks">{JSON.stringify(tasks)}</output>
    {visible && <DecisioningSummaryContent loanNumber="SYNTHETIC" borrowerName="Synthetic Borrower" />}
  </>;
}
function mount() {
  const location = memoryLocation({ path: "/loans/fixture-a/decisioning" });
  return { location, ...render(<Router hook={location.hook}>
    <LoanActivityProvider><ChecklistProvider><Fixture /></ChecklistProvider></LoanActivityProvider>
  </Router>) };
}
const toggle = () => fireEvent.click(screen.getByText("Toggle summary"));
const decision = () => screen.getByTestId("text-loan-decision-value").textContent;
const canView = () => screen.getByTestId("button-view-decision-letter").getAttribute("aria-disabled") === "false";
const storedActivity = () => localStorage.getItem("loan-runtime-activity:fixture-a");
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.useRealTimers(); });

describe("approved restoration from existing per-loan checklist", () => {
  it.each(["approve", "generate", "deliver"] as const)("%s survives section return, route return and provider reload without new events", stage => {
    let view = mount();
    click("button-pull-credit");
    click("button-decision-loan");
    if (stage !== "approve") click("button-generate-decision-letter");
    if (stage === "deliver") click("button-deliver-decision-letter");
    const activity = storedActivity();
    const tasks = localStorage.getItem(key());
    toast.mockClear();
    toggle(); toggle();
    expect(decision()).toBe(restored ? "Loan Approved" : "--");
    expect(canView()).toBe(restored && stage !== "approve");
    expect(screen.getByTestId("text-credit-score-value")).toHaveTextContent("--");
    expect(screen.getByTestId("button-pull-credit")).not.toBeDisabled();
    // A route leaves this summary unmounted, while its providers remain.
    toggle();
    act(() => view.location.navigate("/loans/fixture-a/history"));
    act(() => view.location.navigate("/loans/fixture-a/decisioning"));
    toggle();
    expect(decision()).toBe(restored ? "Loan Approved" : "--");
    view.unmount(); view = mount();
    expect(decision()).toBe(restored ? "Loan Approved" : "--");
    expect(canView()).toBe(restored && stage !== "approve");
    expect(storedActivity()).toBe(activity);
    expect(localStorage.getItem(key())).toBe(tasks);
    expect(toast).not.toHaveBeenCalled();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    click("button-view-decision-letter");
    if (restored && stage !== "approve") expect(open).toHaveBeenCalledExactlyOnceWith("/decision-letter.pdf", "_blank");
    else expect(open).not.toHaveBeenCalled();
  });

  it.each(["not-started", "in-progress", "blocked", "re-fire", "complete", "invalid"])(
    "only complete restores, not %s", status => {
      localStorage.setItem(key(), JSON.stringify({ "Loan Decision": [status], "Decision Letter": [status, "complete"] }));
      mount();
      expect(decision()).toBe(restored && status === "complete" ? "Loan Approved" : "--");
      expect(canView()).toBe(restored && status === "complete");
      expect(screen.getByTestId("text-credit-score-value")).toHaveTextContent("--");
      expect(toast).not.toHaveBeenCalled();
    });

  it.each(["{", "null", "[]", "{}"])("does not invent completion from corrupt/missing fields: %s", value => {
    localStorage.setItem(key(), value);
    mount();
    expect(decision()).toBe("--"); expect(canView()).toBe(false);
  });

  it("does not restore from unreadable storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    mount();
    expect(decision()).toBe("--"); expect(canView()).toBe(false);
  });

  it("retains in-memory completion with writes denied but does not invent persistence on reload", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    const view = mount();
    click("button-decision-loan"); click("button-generate-decision-letter");
    toggle(); toggle();
    expect(decision()).toBe(restored ? "Loan Approved" : "--");
    expect(canView()).toBe(restored);
    view.unmount(); mount();
    expect(decision()).toBe("--"); expect(canView()).toBe(false);
  });

  it("isolates loan A/B and restores A without repeating activity", () => {
    const { location } = mount();
    click("button-decision-loan"); click("button-generate-decision-letter");
    const activity = storedActivity();
    act(() => location.navigate("/loans/fixture-b/decisioning"));
    expect(decision()).toBe("--"); expect(canView()).toBe(false);
    act(() => location.navigate("/loans/fixture-a/decisioning"));
    expect(decision()).toBe(restored ? "Loan Approved" : "--");
    expect(canView()).toBe(restored);
    expect(storedActivity()).toBe(activity);
  });

  it("clears on reset, then restores newer completion instead of replaying an old reset", () => {
    mount();
    click("button-decision-loan"); click("button-generate-decision-letter"); click("button-pull-credit");
    fireEvent.click(screen.getByText("Reset fixture"));
    expect(decision()).toBe("--"); expect(canView()).toBe(false);
    expect(screen.getByTestId("text-credit-score-value")).toHaveTextContent("--");
    click("button-decision-loan"); click("button-generate-decision-letter");
    toggle(); toggle();
    expect(decision()).toBe(restored ? "Loan Approved" : "--");
    expect(canView()).toBe(restored);
    toggle(); fireEvent.click(screen.getByText("Reset fixture")); toggle();
    expect(decision()).toBe("--"); expect(canView()).toBe(false);
  });

  it("preserves generation-before-approval regression and mounted letter access", () => {
    mount();
    click("button-generate-decision-letter");
    click("button-decision-loan");
    expect(canView()).toBe(true);
    expect(JSON.parse(localStorage.getItem(key())!)["Decision Letter"][0]).toBe("in-progress");
    toggle(); toggle();
    expect(canView()).toBe(false);
  });

  it("does not clear decision display when full reset fails to remove package storage", () => {
    mount();
    click("button-decision-loan"); click("button-generate-decision-letter");
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
    fireEvent.click(screen.getByText("Reset full fixture"));
    expect(decision()).toBe("Loan Approved"); expect(canView()).toBe(true);
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Demo could not be reset" }));
    toggle(); toggle();
    expect(decision()).toBe(restored ? "Loan Approved" : "--"); expect(canView()).toBe(restored);
  });

  it("does not clear decision display on disclosure-only reset", () => {
    mount();
    click("button-decision-loan"); click("button-generate-decision-letter");
    act(() => { resetClosingDisclosureHistory("fixture-a", true); });
    expect(decision()).toBe("Loan Approved"); expect(canView()).toBe(true);
    toggle(); toggle();
    expect(decision()).toBe(restored ? "Loan Approved" : "--"); expect(canView()).toBe(restored);
  });
});
