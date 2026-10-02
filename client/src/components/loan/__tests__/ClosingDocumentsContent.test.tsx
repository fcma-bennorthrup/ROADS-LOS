import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { ClosingDocumentsContent } from "../DocumentsContent";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import { closingDisclosureStorageKey } from "@/lib/closing-disclosure-history";

function Reset() {
  const { resetDemoTasks } = useChecklist();
  return <button onClick={() => resetDemoTasks(["Closing Disclosure"])}>Reset Demo</button>;
}

function Harness({ loanId = "prototype" }: { loanId?: string }) {
  const [visible, setVisible] = useState(true);
  return <ChecklistProvider>
    <button onClick={() => setVisible(!visible)}>Navigate away/back</button>
    <Reset />
    {visible && <ClosingDocumentsContent loanId={loanId} />}
  </ChecklistProvider>;
}

const button = (name: string) => screen.getByRole("button", { name });
function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}
function generate() {
  fireEvent.click(button("Generate Closing Disclosure"));
  act(() => vi.advanceTimersByTime(5000));
}
function row(id: number) {
  return screen.getByText(`CD ${id}`).closest("tr")!;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 2, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Closing Documents tabs and history", () => {
  it("defaults to disclosure with empty history and disabled actions", () => {
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "Closing Disclosure" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Closing Package" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("No Closing Disclosures have been generated")).toBeVisible();
    expect(button("View Closing Disclosure")).toBeDisabled();
    expect(button("Deliver Closing Disclosure")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Generate Closing Package" })).not.toBeInTheDocument();
  });

  it("supports keyboard tab navigation", () => {
    render(<Harness />);
    const disclosure = screen.getByRole("tab", { name: "Closing Disclosure" });
    act(() => disclosure.focus());
    fireEvent.keyDown(disclosure, { key: "ArrowRight" });
    act(() => vi.runOnlyPendingTimers());
    expect(screen.getByRole("tab", { name: "Closing Package" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Closing Package" })).toHaveAttribute("aria-selected", "true");
  });

  it("generates multiple disclosures newest first without concurrent duplicates", () => {
    render(<Harness />);
    fireEvent.click(button("Generate Closing Disclosure"));
    fireEvent.click(button("Generate Closing Disclosure"));
    expect(button("Generate Closing Disclosure")).toBeDisabled();
    expect(screen.getByText(/Generating Closing Disclosure/)).toBeVisible();
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.queryByText("CD 1")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    generate();
    expect(screen.getAllByText(/^CD \d$/).map((node) => node.textContent)).toEqual(["CD 2", "CD 1"]);
  });

  it("targets individual deliveries and keeps original delivery timestamps", () => {
    render(<Harness />);
    generate();
    generate();
    const olderDelivery = within(row(1)).getByRole("button", { name: /Deliver/ });
    fireEvent.click(olderDelivery);
    const first = JSON.parse(localStorage.getItem(closingDisclosureStorageKey("prototype"))!);
    expect(first[0].deliveredAt).toBeNull();
    expect(first[1].deliveredAt).not.toBeNull();
    vi.setSystemTime(new Date(2026, 9, 3, 11, 0));
    fireEvent.click(olderDelivery);
    expect(JSON.parse(localStorage.getItem(closingDisclosureStorageKey("prototype"))!)[1].deliveredAt).toBe(first[1].deliveredAt);
    fireEvent.click(button("Deliver Closing Disclosure"));
    expect(JSON.parse(localStorage.getItem(closingDisclosureStorageKey("prototype"))!)[0].deliveredAt).not.toBeNull();
  });

  it("does not lose delivery changes made during generation", () => {
    render(<Harness />);
    generate();
    fireEvent.click(button("Generate Closing Disclosure"));
    fireEvent.click(button("Deliver Closing Disclosure"));
    act(() => vi.advanceTimersByTime(5000));
    const saved = JSON.parse(localStorage.getItem(closingDisclosureStorageKey("prototype"))!);
    expect(saved[1].deliveredAt).not.toBeNull();
    expect(saved[0].deliveredAt).toBeNull();
  });

  it("opens sample PDFs without fabricating borrower views and leaves clock/edit inert", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Harness />);
    generate();
    fireEvent.click(button("View Closing Disclosure"));
    fireEvent.click(within(row(1)).getByRole("button", { name: /View/ }));
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledWith(expect.stringContaining("SampleCD"), "_blank", "noopener,noreferrer");
    const cells = within(row(1)).getAllByRole("cell");
    expect(cells[3]).toBeEmptyDOMElement();
    expect(cells[4]).toBeEmptyDOMElement();
    expect(cells[5]).toBeEmptyDOMElement();
    expect(cells[6]).toBeEmptyDOMElement();
    expect(within(row(1)).queryByRole("button", { name: /clock|edit|history/i })).not.toBeInTheDocument();
  });

  it("retains history across tabs and unmount/remount and isolates loans", () => {
    const view = render(<Harness />);
    generate();
    selectTab("Closing Package");
    expect(screen.getByRole("tab", { name: "Closing Package" })).toHaveAttribute("aria-selected", "true");
    selectTab("Closing Disclosure");
    expect(screen.getByText("CD 1")).toBeVisible();
    fireEvent.click(button("Navigate away/back"));
    fireEvent.click(button("Navigate away/back"));
    expect(screen.getByText("CD 1")).toBeVisible();
    view.rerender(<Harness loanId="other" />);
    expect(screen.queryByText("CD 1")).not.toBeInTheDocument();
    generate();
    view.rerender(<Harness />);
    expect(screen.queryByText("CD 2")).not.toBeInTheDocument();
    expect(screen.getByText("CD 1")).toBeVisible();
  });

  it("Reset Demo clears history and cancels pending generation, also while unmounted", () => {
    render(<Harness />);
    generate();
    fireEvent.click(button("Generate Closing Disclosure"));
    fireEvent.click(button("Reset Demo"));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText("CD 1")).not.toBeInTheDocument();
    generate();
    fireEvent.click(button("Navigate away/back"));
    fireEvent.click(button("Reset Demo"));
    fireEvent.click(button("Navigate away/back"));
    expect(screen.queryByText("CD 1")).not.toBeInTheDocument();
  });

  it("preserves package generation, PDF preview and delivery when switching tabs", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Harness />);
    selectTab("Closing Package");
    expect(button("View Closing Package")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button("Generate Closing Package"));
    selectTab("Closing Disclosure");
    act(() => vi.advanceTimersByTime(5000));
    selectTab("Closing Package");
    expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("Last Generated:");
    fireEvent.click(button("View Closing Package"));
    expect(open).toHaveBeenCalledWith(expect.stringContaining("Redacted-ClosingPackage"), "_blank", "noopener,noreferrer");
    fireEvent.click(button("Deliver Closing Package"));
    selectTab("Closing Disclosure");
    selectTab("Closing Package");
    expect(screen.getByTestId("text-closing-package-delivered")).toHaveTextContent("Marked Delivered:");
  });

  it("reports unreadable storage without silently replacing saved history", () => {
    const key = closingDisclosureStorageKey("prototype");
    localStorage.setItem(key, "broken history");
    render(<Harness />);
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    expect(button("Generate Closing Disclosure")).toBeDisabled();
    expect(localStorage.getItem(key)).toBe("broken history");
    fireEvent.click(button("Reset Demo"));
    generate();
    expect(screen.getByText("CD 1")).toBeVisible();
  });

  it("reports failed writes without claiming a disclosure was saved", () => {
    render(<Harness />);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    generate();
    expect(screen.getByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.queryByText("CD 1")).not.toBeInTheDocument();
  });
});