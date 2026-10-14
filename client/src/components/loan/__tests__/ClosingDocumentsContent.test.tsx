import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ClosingDocumentsContent } from "../DocumentsContent";
import { ChecklistProvider, useChecklist } from "@/contexts/checklist-context";
import {
  closingDisclosureStorageKey,
  loadClosingDisclosures,
  resetClosingDisclosureHistory,
} from "@/lib/closing-disclosure-history";
import { useClosingDisclosures } from "@/hooks/use-closing-disclosures";
import { DocumentSection } from "../DisclosureDocumentsContent";

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
    expect(screen.queryByRole("button", { name: "View Closing Disclosure" })).not.toBeInTheDocument();
    expect(button("Deliver Closing Disclosure")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Generate Closing Package" })).not.toBeInTheDocument();
  });

  it("keeps three toolbar controls and seven aligned columns in empty and populated history", () => {
    render(<Harness />);
    const toolbar = button("Generate Closing Disclosure").parentElement!;
    expect(within(toolbar).getAllByRole("button").map((node) => node.textContent)).toEqual([
      "Generate Closing Disclosure", "Deliver Closing Disclosure", "Reset Closing Disclosure",
    ]);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((node) => node.getAttribute("aria-label") || node.textContent)).toEqual([
      "Document ID", "Date Generated", "Delivery Date", "Assumed Delivery Date", "Delivery Method", "CD Viewed", "Document actions",
    ]);
    expect(screen.getByTestId("text-closing-disclosure-empty")).toHaveAttribute("colspan", "7");
    generate();
    expect(within(row(1)).getAllByRole("cell")).toHaveLength(7);
    expect(within(row(1)).getByRole("button", { name: "View Closing Disclosure CD 1" })).toBeEnabled();
    expect(screen.queryByTestId("button-view-closing-disclosure")).not.toBeInTheDocument();
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

  it("delivers only the newest disclosure from the toolbar and keeps original timestamps", () => {
    render(<Harness />);
    generate();
    generate();
    fireEvent.click(button("Deliver Closing Disclosure"));
    const first = loadClosingDisclosures("prototype");
    expect(first[0].deliveredAt).not.toBeNull();
    expect(first[1].deliveredAt).toBeNull();
    expect(within(row(2)).getAllByRole("cell")[2]).not.toBeEmptyDOMElement();
    expect(within(row(1)).getAllByRole("cell")[2]).toBeEmptyDOMElement();
    expect(button("Deliver Closing Disclosure")).toBeDisabled();
    vi.setSystemTime(new Date(2026, 9, 3, 11, 0));
    fireEvent.click(button("Deliver Closing Disclosure"));
    expect(loadClosingDisclosures("prototype")[0].deliveredAt).toBe(first[0].deliveredAt);
    expect(loadClosingDisclosures("prototype")[1].deliveredAt).toBeNull();
    for (const id of [1, 2]) {
      expect(within(row(id)).getAllByRole("cell")).toHaveLength(7);
      const actions = within(row(id)).getAllByRole("cell")[6];
      expect(within(actions).queryByRole("button", { name: /Deliver/ })).not.toBeInTheDocument();
      expect(within(actions).getAllByRole("button")).toHaveLength(2);
      expect(actions.querySelectorAll("svg")).toHaveLength(3);
      expect(Array.from(actions.firstElementChild!.children).map((node) => node.tagName))
        .toEqual(["BUTTON", "SPAN", "BUTTON"]);
      expect(within(actions).getByTitle("History")).toHaveAttribute("aria-hidden", "true");
      expect(within(actions).getByRole("button", { name: `Edit Closing Disclosure CD ${id}` })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: /Deliver Closing Disclosure/ })).toHaveLength(1);
  });

  it("preserves saved older delivery dates and history when rendering and delivering from the toolbar", () => {
    const older = { id: 1, generatedAt: "2026-09-30T10:00:00.000Z", deliveredAt: "2026-09-30T11:00:00.000Z" };
    const newer = { id: 2, generatedAt: "2026-10-01T10:00:00.000Z", deliveredAt: null };
    const saved = JSON.stringify([newer, older]);
    localStorage.setItem(closingDisclosureStorageKey("prototype"), saved);
    render(<Harness />);
    expect(localStorage.getItem(closingDisclosureStorageKey("prototype"))).toBe(saved);
    expect(within(row(1)).getAllByRole("cell")[2]).not.toBeEmptyDOMElement();
    const displayedDate = within(row(1)).getAllByRole("cell")[2].textContent;
    expect(within(row(1)).queryByRole("button", { name: /Deliver/ })).not.toBeInTheDocument();
    fireEvent.click(button("Deliver Closing Disclosure"));
    const records = loadClosingDisclosures("prototype");
    expect(records[0].deliveredAt).not.toBeNull();
    expect(records[1]).toEqual(older);
    expect(within(row(1)).getAllByRole("cell")[2]).toHaveTextContent(displayedDate!);
    expect(within(row(2)).queryByRole("button", { name: /Deliver/ })).not.toBeInTheDocument();
  });

  it("does not lose delivery changes made during generation", () => {
    render(<Harness />);
    generate();
    fireEvent.click(button("Generate Closing Disclosure"));
    fireEvent.click(button("Deliver Closing Disclosure"));
    act(() => vi.advanceTimersByTime(5000));
    const saved = loadClosingDisclosures("prototype");
    expect(saved[1].deliveredAt).not.toBeNull();
    expect(saved[0].deliveredAt).toBeNull();
  });

  it("opens sample PDFs without fabricating borrower views and leaves clock inert", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Harness />);
    generate();
    fireEvent.click(within(row(1)).getByRole("button", { name: /View/ }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(expect.stringContaining("SampleCD"), "_blank", "noopener,noreferrer");
    expect(loadClosingDisclosures("prototype")[0].borrowerDetails).toBeUndefined();
    const cells = within(row(1)).getAllByRole("cell");
    expect(cells[3]).toBeEmptyDOMElement();
    expect(cells[4]).toHaveTextContent("Not recorded");
    expect(cells[5]).toHaveTextContent("No borrowers");
    expect(cells).toHaveLength(7);
    expect(within(cells[6]).getByRole("button", { name: "View Closing Disclosure CD 1" })).toBeEnabled();
    expect(within(row(1)).queryByRole("button", { name: /clock|history/i })).not.toBeInTheDocument();
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

function UnrelatedProgress() {
  const { demoResetVersion, completeAction, getActionStatus } = useChecklist();
  return <>
    <button onClick={() => completeAction("Loan Decision", 0)}>Complete another task</button>
    <output data-testid="unrelated-checklist-status">{getActionStatus("Loan Decision", 0)}</output>
    <DocumentSection title="Unrelated document" idleText="Unrelated idle"
      generatingText="Generating unrelated document" generateLabel="Generate unrelated document"
      testIdPrefix="unrelated-document" resetVersion={demoResetVersion} />
  </>;
}

describe("Dedicated Closing Disclosure reset", () => {
  it("asks for confirmation and cancel preserves history and pending generation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Harness />);
    generate();
    fireEvent.click(button("Deliver Closing Disclosure"));
    const saved = localStorage.getItem(closingDisclosureStorageKey("prototype"));
    fireEvent.click(button("Generate Closing Disclosure"));
    fireEvent.click(button("Reset Closing Disclosure"));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("their delivery timestamps for this loan"));
    expect(localStorage.getItem(closingDisclosureStorageKey("prototype"))).toBe(saved);
    expect(screen.getByText(/Generating Closing Disclosure/)).toBeVisible();
    act(() => vi.advanceTimersByTime(5000));
    expect(loadClosingDisclosures("prototype")).toHaveLength(2);
  });

  it("clears saved rows and delivery dates, cancels generation, survives remount, and restarts at CD 1", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Harness />);
    generate();
    fireEvent.click(button("Deliver Closing Disclosure"));
    generate();
    fireEvent.click(button("Generate Closing Disclosure"));
    fireEvent.click(button("Reset Closing Disclosure"));
    expect(loadClosingDisclosures("prototype")).toEqual([]);
    expect(screen.queryByTestId("button-view-closing-disclosure")).not.toBeInTheDocument();
    expect(button("Deliver Closing Disclosure")).toBeDisabled();
    expect(button("Generate Closing Disclosure")).toBeEnabled();
    act(() => vi.advanceTimersByTime(10000));
    fireEvent.click(button("Navigate away/back"));
    fireEvent.click(button("Navigate away/back"));
    expect(screen.getByText("No Closing Disclosures have been generated")).toBeVisible();
    generate();
    expect(loadClosingDisclosures("prototype").map((record) => record.id)).toEqual([1]);
    expect(loadClosingDisclosures("prototype")[0].deliveredAt).toBeNull();
  });

  it("recovers unreadable history without affecting another loan", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const other = [{ id: 8, generatedAt: new Date().toISOString(), deliveredAt: null }];
    localStorage.setItem(closingDisclosureStorageKey("other"), JSON.stringify(other));
    localStorage.setItem(closingDisclosureStorageKey("prototype"), "broken");
    render(<Harness />);
    expect(button("Generate Closing Disclosure")).toBeDisabled();
    expect(button("Reset Closing Disclosure")).toBeEnabled();
    fireEvent.click(button("Reset Closing Disclosure"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(loadClosingDisclosures("other")).toEqual(other);
    generate();
    expect(screen.getByText("CD 1")).toBeVisible();
  });

  it("shows failed reset writes and retains the visible and saved history", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Harness />);
    generate();
    fireEvent.click(button("Deliver Closing Disclosure"));
    const saved = localStorage.getItem(closingDisclosureStorageKey("prototype"));
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
    fireEvent.click(button("Reset Closing Disclosure"));
    expect(screen.getByRole("alert")).toHaveTextContent("could not be reset");
    expect(screen.getByText("CD 1")).toBeVisible();
    expect(localStorage.getItem(closingDisclosureStorageKey("prototype"))).toBe(saved);
    expect(button("Reset Closing Disclosure")).toBeEnabled();
    write.mockRestore();
    fireEvent.click(button("Reset Closing Disclosure"));
    expect(screen.getByText("No Closing Disclosures have been generated")).toBeVisible();
  });

  it("does not globally reset sibling document progress or unrelated checklist tasks", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ChecklistProvider><UnrelatedProgress /><ClosingDocumentsContent /></ChecklistProvider>);
    fireEvent.click(button("Complete another task"));
    fireEvent.click(button("Generate unrelated document"));
    generate();
    const before = screen.getByTestId("text-unrelated-document-status").textContent;
    fireEvent.click(button("Reset Closing Disclosure"));
    expect(screen.getByTestId("text-unrelated-document-status")).toHaveTextContent(before!);
    expect(screen.getByTestId("unrelated-checklist-status")).toHaveTextContent("complete");
  });

  it("keeps scoped native resets scoped and preserves the broader Reset Demo signal", () => {
    render(<ChecklistProvider><Reset /><UnrelatedProgress /><ClosingDocumentsContent /></ChecklistProvider>);
    fireEvent.click(button("Complete another task"));
    fireEvent.click(button("Generate unrelated document"));
    generate();
    const before = screen.getByTestId("text-unrelated-document-status").textContent;
    act(() => externalWrite("prototype", JSON.stringify({
      records: [], resetToken: "remote-scoped-reset", resetScope: "disclosure",
    })));
    expect(screen.getByText("No Closing Disclosures have been generated")).toBeVisible();
    expect(screen.getByTestId("text-unrelated-document-status")).toHaveTextContent(before!);
    expect(screen.getByTestId("unrelated-checklist-status")).toHaveTextContent("complete");
    fireEvent.click(button("Reset Demo"));
    expect(screen.getByText("Unrelated idle")).toBeVisible();
  });

  it("leaves completed package delivery and in-progress package generation unchanged", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Harness />);
    selectTab("Closing Package");
    fireEvent.click(button("Generate Closing Package"));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(button("Deliver Closing Package"));
    const generated = screen.getByTestId("text-closing-package-status").textContent;
    const delivered = screen.getByTestId("text-closing-package-delivered").textContent;
    selectTab("Closing Disclosure");
    generate();
    fireEvent.click(button("Reset Closing Disclosure"));
    selectTab("Closing Package");
    expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent(generated!);
    expect(screen.getByTestId("text-closing-package-delivered")).toHaveTextContent(delivered!);
    fireEvent.click(button("Generate Closing Package"));
    selectTab("Closing Disclosure");
    fireEvent.click(button("Reset Closing Disclosure"));
    act(() => vi.advanceTimersByTime(5000));
    selectTab("Closing Package");
    expect(screen.getByTestId("text-closing-package-status")).toHaveTextContent("Last Generated:");
    expect(screen.getByTestId("text-closing-package-delivered")).toHaveTextContent(delivered!);
  });
});

// Independent hook instances model tab snapshots. Direct storage writes deliberately
// omit notifications to exercise stale consumers; StorageEvents model other windows.
function consumer(loanId = "prototype") {
  const { hook } = memoryLocation({ path: `/loans/${loanId}` });
  return renderHook(() => useClosingDisclosures(loanId), {
    wrapper: ({ children }) => <Router hook={hook}>
      <ChecklistProvider>{children}</ChecklistProvider>
    </Router>,
  });
}

function externalWrite(loanId: string, value: string | null, notify = true) {
  const key = closingDisclosureStorageKey(loanId);
  const oldValue = localStorage.getItem(key);
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  if (notify) window.dispatchEvent(new StorageEvent("storage", {
    key, oldValue, newValue: value, storageArea: localStorage,
  }));
}

describe("Closing Disclosure independent consumers", () => {
  it("dedicated reset synchronizes consumers, cancels old generation and isolates another loan", () => {
    const a = consumer();
    const b = consumer();
    const other = consumer("other");
    act(() => {
      a.result.current.generate();
      vi.advanceTimersByTime(5000);
      a.result.current.deliver(1);
      a.result.current.generate();
      b.result.current.generate();
      other.result.current.generate();
      a.result.current.reset();
      vi.advanceTimersByTime(5000);
    });
    expect(a.result.current.records).toEqual([]);
    expect(b.result.current.records).toEqual([]);
    expect(b.result.current.generating).toBe(false);
    expect(other.result.current.records).toHaveLength(1);
    act(() => {
      b.result.current.generate();
      vi.advanceTimersByTime(5000);
    });
    expect(a.result.current.records[0].id).toBe(1);
    expect(a.result.current.records[0].deliveredAt).toBeNull();
  });

  it("handles asynchronous reset success and failure without duplicate reset requests", async () => {
    let pending = Promise.resolve();
    const request = vi.fn((_name: string, write: () => void) => {
      const result = pending.then(write);
      pending = result.catch(() => {});
      return result;
    });
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    try {
      const a = consumer();
      const b = consumer();
      await act(async () => {
        a.result.current.generate();
        vi.advanceTimersByTime(5000);
        await pending;
      });
      const saved = localStorage.getItem(closingDisclosureStorageKey("prototype"));
      const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
      await act(async () => {
        a.result.current.reset();
        a.result.current.reset();
        a.result.current.generate();
        expect(request).toHaveBeenCalledTimes(2);
        await pending;
      });
      expect(a.result.current.error).toContain("could not be reset");
      expect(a.result.current.resetting).toBe(false);
      expect(b.result.current.records).toHaveLength(1);
      expect(localStorage.getItem(closingDisclosureStorageKey("prototype"))).toBe(saved);
      write.mockRestore();
      act(() => b.result.current.generate());
      await act(async () => {
        a.result.current.reset();
        expect(request).toHaveBeenCalledTimes(3);
        await pending;
      });
      act(() => vi.advanceTimersByTime(5000));
      expect(a.result.current.error).toBeNull();
      expect(a.result.current.records).toEqual([]);
      expect(b.result.current.records).toEqual([]);
      expect(b.result.current.generating).toBe(false);
    } finally {
      Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    }
  });

  it("allocates unique IDs and shares generation and delivery across two same-loan consumers", () => {
    const a = consumer();
    const b = consumer();
    act(() => {
      a.result.current.generate();
      b.result.current.generate();
      vi.advanceTimersByTime(5000);
    });
    expect(a.result.current.records.map((row) => row.id)).toEqual([2, 1]);
    expect(b.result.current.records).toEqual(a.result.current.records);
    act(() => a.result.current.deliver(1));
    expect(b.result.current.records[1].deliveredAt).not.toBeNull();
    expect(b.result.current.records[0].deliveredAt).toBeNull();
  });

  it("merges against storage even before a tab receives its storage event", () => {
    const a = consumer();
    const b = consumer();
    act(() => {
      a.result.current.generate();
      vi.advanceTimersByTime(5000);
    });
    const first = loadClosingDisclosures("prototype")[0];
    const deliveredAt = "2026-10-02T12:00:00.000Z";
    externalWrite("prototype", JSON.stringify([
      { id: 2, generatedAt: first.generatedAt, deliveredAt: null },
      { ...first, deliveredAt },
    ]), false);
    act(() => b.result.current.deliver(1));
    expect(loadClosingDisclosures("prototype").map((row) => row.id)).toEqual([2, 1]);
    expect(a.result.current.records[1].deliveredAt).toBe(deliveredAt);
    externalWrite("prototype", JSON.stringify([
      { id: 3, generatedAt: first.generatedAt, deliveredAt: null },
      ...loadClosingDisclosures("prototype"),
    ]), false);
    act(() => {
      b.result.current.generate();
      vi.advanceTimersByTime(5000);
    });
    expect(a.result.current.records.map((row) => row.id)).toEqual([4, 3, 2, 1]);
    expect(a.result.current.records[3].deliveredAt).toBe(deliveredAt);
  });

  it("synchronizes native storage events, ignores stale event payloads, and isolates loans", () => {
    const a = consumer();
    const b = consumer();
    const other = consumer("other");
    const value = JSON.stringify([{ id: 7, generatedAt: new Date().toISOString(), deliveredAt: null }]);
    act(() => externalWrite("prototype", value));
    expect(a.result.current.records[0].id).toBe(7);
    expect(b.result.current.records).toEqual(a.result.current.records);
    expect(other.result.current.records).toEqual([]);
    act(() => {
      other.result.current.generate();
      vi.advanceTimersByTime(5000);
      window.dispatchEvent(new StorageEvent("storage", {
        key: closingDisclosureStorageKey("prototype"), newValue: "[]",
      }));
    });
    expect(a.result.current.records[0].id).toBe(7);
    expect(other.result.current.records[0].id).toBe(1);
  });

  it("propagates resets, cancels pending generation, and does not reset another loan", () => {
    const a = consumer();
    const b = consumer();
    const other = consumer("other");
    act(() => {
      a.result.current.generate();
      b.result.current.generate();
      other.result.current.generate();
      resetClosingDisclosureHistory("prototype");
      vi.advanceTimersByTime(5000);
    });
    expect(a.result.current.generating).toBe(false);
    expect(b.result.current.generating).toBe(false);
    expect(a.result.current.records).toEqual([]);
    expect(b.result.current.records).toEqual([]);
    expect(other.result.current.records).toHaveLength(1);
    act(() => {
      b.result.current.generate();
      vi.advanceTimersByTime(5000);
    });
    expect(a.result.current.records[0].id).toBe(1);
  });

  it("does not resurrect pending history if a reset event has not yet reached the tab", () => {
    const a = consumer();
    act(() => a.result.current.generate());
    externalWrite("prototype", JSON.stringify({ records: [], resetToken: "remote-reset" }), false);
    act(() => vi.advanceTimersByTime(5000));
    expect(loadClosingDisclosures("prototype")).toEqual([]);
    expect(a.result.current.records).toEqual([]);
  });

  it("synchronizes a remote reset token even if history was already empty", () => {
    const a = consumer();
    const b = consumer();
    act(() => {
      a.result.current.generate();
      b.result.current.generate();
      externalWrite("prototype", JSON.stringify({ records: [], resetToken: "remote-reset" }));
      vi.advanceTimersByTime(5000);
    });
    expect(a.result.current.generating).toBe(false);
    expect(b.result.current.generating).toBe(false);
    expect(loadClosingDisclosures("prototype")).toEqual([]);
  });

  it("handles native reset/removal and clear events and malformed remote history", () => {
    const a = consumer();
    act(() => {
      a.result.current.generate();
      vi.advanceTimersByTime(5000);
      a.result.current.generate();
      externalWrite("prototype", null);
      vi.advanceTimersByTime(5000);
    });
    expect(a.result.current.records).toEqual([]);
    act(() => externalWrite("prototype", "invalid"));
    expect(a.result.current.error).toContain("could not be loaded");
    expect(localStorage.getItem(closingDisclosureStorageKey("prototype"))).toBe("invalid");
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(a.result.current.error).toBeNull();
  });

  it("does not publish delivery or reset success when storage writes fail", () => {
    const a = consumer();
    const b = consumer();
    act(() => {
      a.result.current.generate();
      vi.advanceTimersByTime(5000);
    });
    const saved = localStorage.getItem(closingDisclosureStorageKey("prototype"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
    act(() => a.result.current.deliver(1));
    expect(a.result.current.error).toContain("could not be saved");
    expect(b.result.current.records[0].deliveredAt).toBeNull();
    expect(() => resetClosingDisclosureHistory("prototype")).toThrow("Full");
    expect(localStorage.getItem(closingDisclosureStorageKey("prototype"))).toBe(saved);
  });

  it("serializes concurrent writes using browser locks and reports asynchronous failures", async () => {
    let pending = Promise.resolve();
    const request = vi.fn((_name: string, write: () => void) => {
      const result = pending.then(write);
      pending = result.catch(() => {});
      return result;
    });
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    try {
      const a = consumer();
      const b = consumer();
      await act(async () => {
        a.result.current.generate();
        b.result.current.generate();
        vi.advanceTimersByTime(5000);
        await pending;
      });
      expect(request).toHaveBeenCalledTimes(2);
      expect(a.result.current.records.map((row) => row.id)).toEqual([2, 1]);
      expect(b.result.current.records).toEqual(a.result.current.records);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
      await act(async () => {
        a.result.current.deliver(1);
        await pending;
      });
      expect(a.result.current.error).toContain("could not be saved");
      expect(b.result.current.records[1].deliveredAt).toBeNull();
    } finally {
      Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    }
  });
});