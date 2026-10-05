import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Router } from "wouter";
import { ClosingDocumentsContent } from "../DocumentsContent";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { closingPackageStorageKey } from "@/lib/closing-package-progress";
import { toast } from "@/hooks/use-toast";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn(), dismissToasts: vi.fn() }));

function Reset() {
  const { resetDemoTasks, tasks } = useChecklist();
  return <>
    <button onClick={() => resetDemoTasks(tasks.map((task) => task.name))}>Reset Demo</button>
    <button onClick={() => resetDemoTasks(["Closing Disclosure"])}>Reset Disclosure only</button>
  </>;
}

function Harness({ loanId = "one" }: { loanId?: string }) {
  const [visible, setVisible] = useState(true);
  return <Router hook={() => [`/loans/${loanId}/documents`, () => {}]}>
    <ChecklistProvider>
      <button onClick={() => setVisible(!visible)}>Navigate away/back</button>
      <Reset />
      {visible && <ClosingDocumentsContent loanId={loanId} />}
    </ChecklistProvider>
  </Router>;
}

const button = (name: string) => screen.getByRole("button", { name });
const click = (name: string) => fireEvent.click(button(name));
function packageTab() {
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Closing Package" }), { button: 0, ctrlKey: false });
}
function generate() {
  click("Generate Closing Package");
  act(() => vi.advanceTimersByTime(5000));
}
function expectIdle() {
  expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("No Closing Packages have been generated");
  expect(screen.queryByTestId("text-closing-package-delivered")).not.toBeInTheDocument();
  expect(button("View Closing Package")).toHaveAttribute("aria-disabled", "true");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 2, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("loan-scoped Closing Package retention", () => {
  it("keeps package progress when only disclosure history is reset", async () => {
    render(<Harness />);
    packageTab();
    generate();
    click("Deliver Closing Package");
    const saved = localStorage.getItem(closingPackageStorageKey("one"));
    await act(async () => click("Reset Disclosure only"));
    expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("Last Generated:");
    expect(screen.getByTestId("text-closing-package-delivered")).toBeVisible();
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBe(saved);
  });

  it("keeps exact generation and delivery timestamps after navigation and a fresh mount", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const view = render(<Harness />);
    packageTab();
    generate();
    click("Deliver Closing Package");
    const generated = screen.getByTestId("text-closing-package-status").textContent;
    const delivered = screen.getByTestId("text-closing-package-delivered").textContent;
    const saved = localStorage.getItem(closingPackageStorageKey("one"));
    click("Navigate away/back");
    act(() => vi.advanceTimersByTime(60000));
    click("Navigate away/back");
    packageTab();
    expect(screen.getByTestId("text-closing-package-status").textContent).toBe(generated);
    expect(screen.getByTestId("text-closing-package-delivered").textContent).toBe(delivered);
    view.unmount();
    render(<Harness />);
    packageTab();
    expect(screen.getByTestId("text-closing-package-status").textContent).toBe(generated);
    expect(screen.getByTestId("text-closing-package-delivered").textContent).toBe(delivered);
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBe(saved);
    click("View Closing Package");
    expect(open).toHaveBeenCalledWith(expect.stringContaining("Redacted-ClosingPackage"), "_blank", "noopener,noreferrer");
    expect(screen.getByText(/Delivery is marked for prototype tracking only/, { selector: ".closing-documents-panel:not([hidden]) p" })).toBeVisible();
  });

  it("resumes pending generation after navigation or a refresh without restarting its delay", () => {
    const view = render(<Harness />);
    packageTab();
    click("Generate Closing Package");
    act(() => vi.advanceTimersByTime(2000));
    click("Navigate away/back");
    act(() => vi.advanceTimersByTime(2000));
    click("Navigate away/back");
    packageTab();
    expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("Generating Closing Package");
    view.unmount();
    render(<Harness />);
    packageTab();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("Last Generated:");
  });

  it("completes an overdue operation on return and rejects concurrent generation", () => {
    render(<Harness />);
    packageTab();
    click("Generate Closing Package");
    const saved = localStorage.getItem(closingPackageStorageKey("one"));
    click("Generate Closing Package");
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBe(saved);
    click("Navigate away/back");
    act(() => vi.advanceTimersByTime(10000));
    click("Navigate away/back");
    packageTab();
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("Last Generated:");
  });

  it("keeps loans isolated including pending generation and resets only the current loan", () => {
    const view = render(<Harness loanId="one" />);
    packageTab();
    generate();
    click("Deliver Closing Package");
    const firstLoan = localStorage.getItem(closingPackageStorageKey("one"));
    view.rerender(<Harness loanId="two" />);
    packageTab();
    expectIdle();
    click("Generate Closing Package");
    view.rerender(<Harness loanId="one" />);
    packageTab();
    expect(screen.getByTestId("text-closing-package-delivered")).toBeVisible();
    act(() => vi.advanceTimersByTime(5000));
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBe(firstLoan);
    view.rerender(<Harness loanId="two" />);
    packageTab();
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("Last Generated:");
    expect(screen.queryByTestId("text-closing-package-delivered")).not.toBeInTheDocument();
    click("Reset Demo");
    expectIdle();
    expect(localStorage.getItem(closingPackageStorageKey("two"))).toBeNull();
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBe(firstLoan);
  });

  it("Reset Demo clears completed progress even when Documents is unmounted", () => {
    render(<Harness />);
    packageTab();
    generate();
    click("Deliver Closing Package");
    click("Navigate away/back");
    click("Reset Demo");
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBeNull();
    click("Navigate away/back");
    packageTab();
    expectIdle();
  });

  it.each([true, false])("Reset Demo cancels pending generation (mounted: %s)", (mounted) => {
    render(<Harness />);
    packageTab();
    click("Generate Closing Package");
    if (!mounted) click("Navigate away/back");
    click("Reset Demo");
    act(() => vi.advanceTimersByTime(10000));
    if (!mounted) {
      click("Navigate away/back");
      packageTab();
    }
    expectIdle();
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBeNull();
  });

  it.each(["broken JSON", '{"generatedAt":null,"deliveredAt":"2026-10-02","generatingUntil":null}', '{}'])(
    "reports invalid saved data without overwriting it: %s", (saved) => {
      const key = closingPackageStorageKey("one");
      localStorage.setItem(key, saved);
      render(<Harness />);
      packageTab();
      expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
      expect(button("Generate Closing Package")).toHaveAttribute("aria-disabled", "true");
      click("Generate Closing Package");
      expect(localStorage.getItem(key)).toBe(saved);
      click("Reset Demo");
      expectIdle();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      generate();
      expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("Last Generated:");
    },
  );

  it("reports blocked reads visibly", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
      if (key === closingPackageStorageKey("one")) throw new Error("Blocked storage");
      return null;
    });
    render(<Harness />);
    packageTab();
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
  });

  it.each(["start", "complete", "deliver"])("does not claim unsaved progress when a write fails at %s", (stage) => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Harness />);
    packageTab();
    if (stage === "complete") click("Generate Closing Package");
    if (stage === "deliver") generate();
    const saved = localStorage.getItem(closingPackageStorageKey("one"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
    if (stage === "start") click("Generate Closing Package");
    if (stage === "complete") act(() => vi.advanceTimersByTime(5000));
    if (stage === "deliver") click("Deliver Closing Package");
    expect(screen.getByRole("alert")).toHaveTextContent("could not be saved");
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBe(saved);
    expect(screen.queryByTestId("text-closing-package-delivered")).not.toBeInTheDocument();
    if (stage === "deliver") {
      click("View Closing Package");
      expect(open).toHaveBeenCalledOnce();
      expect(button("Deliver Closing Package")).toHaveAttribute("aria-disabled", "true");
    } else {
      expect(screen.getByTestId("text-closing-package-status")).not.toHaveTextContent("Last Generated:");
    }
  });

  it("reports failed reset removal and retains the displayed package progress", () => {
    render(<Harness />);
    packageTab();
    generate();
    click("Deliver Closing Package");
    const saved = localStorage.getItem(closingPackageStorageKey("one"));
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Blocked storage"); });
    click("Reset Demo");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Demo could not be reset",
      description: expect.stringContaining("Closing Package progress could not be cleared"),
      variant: "destructive",
    }));
    expect(localStorage.getItem(closingPackageStorageKey("one"))).toBe(saved);
    expect(screen.getByTestId("text-closing-package-delivered")).toBeVisible();
  });
});