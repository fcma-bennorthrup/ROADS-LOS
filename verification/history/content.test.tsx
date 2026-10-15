import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HistoryContent } from "@/components/loan/HistoryContent";
import { destinations, records } from "./fixtures";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/loans/synthetic-B/history", navigate] }));

const ids = () => screen.queryAllByTestId(/^change-log-row-/).map(el => Number(el.dataset.testid!.split("-").at(-1)));
const click = (id: string) => fireEvent.click(screen.getByTestId(id));
const search = (value: string) => fireEvent.change(screen.getByTestId("input-search-change-log"), { target: { value } });
const size = (value: number) => {
  click("select-items-per-page");
  click(`select-items-per-page-option-${value}`);
};
const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
beforeEach(() => navigate.mockClear());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Change Log, independently of Activity", () => {
  it("keeps all seven column labels in order and 20 rows by default", () => {
    render(<HistoryContent />);
    expect(screen.getAllByTestId(/^th-/).map(el => el.textContent)).toEqual([
      "Field", "Previous value", "New value", "Changed by", "Position", "Timestamp", "Link to field",
    ]);
    expect(ids()).toEqual(range(1, 20));
    expect(screen.getByTestId("text-page-indicator")).toHaveTextContent("Page 1 of 2");
    expect(screen.getByTestId("button-prev-page")).toBeDisabled();
    click("button-prev-page");
    expect(ids()).toEqual(range(1, 20));
    click("button-next-page");
    expect(ids()).toEqual(range(21, 40));
    expect(screen.getByTestId("button-next-page")).toBeDisabled();
    click("button-next-page");
    expect(ids()).toEqual(range(21, 40));
    click("button-prev-page");
    expect(ids()).toEqual(range(1, 20));
  });

  it("supports 10/20/50 and clamps both bounds", () => {
    render(<HistoryContent />);
    size(10);
    for (let page = 1; page <= 4; page++) {
      expect(ids()).toEqual(range((page - 1) * 10 + 1, page * 10));
      expect(screen.getByTestId("text-page-indicator")).toHaveTextContent(`Page ${page} of 4`);
      click("button-next-page");
    }
    expect(screen.getByTestId("button-next-page")).toBeDisabled();
    size(50);
    expect(ids()).toEqual(range(1, 40));
    expect(screen.getByTestId("text-page-indicator")).toHaveTextContent("Page 1 of 1");
    expect(screen.getByTestId("button-prev-page")).toBeDisabled();
    expect(screen.getByTestId("button-next-page")).toBeDisabled();
    size(20);
    expect(ids()).toEqual(range(1, 20));
  });

  it.each(["search", "sort", "same size", "different size"])("resets page on %s", action => {
    render(<HistoryContent />);
    click("button-next-page");
    if (action === "search") search("Field");
    if (action === "sort") click("th-timestamp");
    if (action === "same size") size(20);
    if (action === "different size") size(10);
    expect(screen.getByTestId("text-page-indicator")).toHaveTextContent(/^Page 1 of /);
    expect(screen.getByTestId("button-prev-page")).toBeDisabled();
  });

  it.each([
    ["field", "FIELD-40", [40]],
    ["previousValue", "BEFORE-40", [40]],
    ["newValue", "AFTER-40", [40]],
    ["changedBy", "ACTOR-40", [40]],
    ["position", "POSITION-40", [40]],
    ["timestamp", "12/31/2025", [40]],
    ["section", "COLLATERAL", [3, 9, 15, 21, 27, 33, 39]],
  ])("searches %s case-insensitively", (_, query, expected) => {
    render(<HistoryContent />);
    search(query as string);
    expect(ids()).toEqual(expected);
  });

  it("ignores blank-only searches but does not trim padded queries; no empty message", () => {
    render(<HistoryContent />);
    search("  \t ");
    expect(ids()).toEqual(range(1, 20));
    search(" Field-40 ");
    expect(ids()).toEqual([]);
    expect(screen.getByTestId("text-page-indicator")).toHaveTextContent("Page 1 of 1");
    expect(screen.getByTestId("button-prev-page")).toBeDisabled();
    expect(screen.getByTestId("button-next-page")).toBeDisabled();
    expect(screen.getAllByTestId(/^th-/)).toHaveLength(7);
    expect(screen.queryByText(/no results|no records|no changes/i)).not.toBeInTheDocument();
    search("Field-40");
    expect(ids()).toEqual([40]);
  });

  it("orders midnight/noon and month/year boundaries in both directions without changing displayed timestamps", () => {
    render(<HistoryContent />);
    size(50);
    expect(ids()).toEqual(range(1, 40));
    for (const entry of records) {
      expect(screen.getByTestId(`td-timestamp-${entry.id}`)).toHaveTextContent(entry.timestamp);
    }
    click("th-timestamp");
    expect(ids()).toEqual(range(1, 40).reverse());
    click("th-timestamp");
    expect(ids()).toEqual(range(1, 40));
  });

  it.each(destinations)("retains the loan-1 fallback for %s", destination => {
    render(<HistoryContent />);
    const id = destinations.indexOf(destination) + 1;
    click(`link-to-field-${id}`);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(destination === "Decisioning"
      ? "/loans/1/decisioning" : `/loans/1/origination?section=${encodeURIComponent(destination)}`);
  });

  it.each(destinations)("gives callback precedence for %s", destination => {
    const callback = vi.fn();
    render(<HistoryContent onNavigateToField={callback} />);
    click(`link-to-field-${destinations.indexOf(destination) + 1}`);
    expect(callback).toHaveBeenCalledExactlyOnceWith(destination);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("uses an inline upward dropdown, closes on outside click/selection, and keeps Escape a no-op", () => {
    render(<HistoryContent />);
    click("select-items-per-page");
    const option = screen.getByTestId("select-items-per-page-option-20");
    expect(option.parentElement).toHaveStyle({ position: "absolute", bottom: "calc(100% + 4px)" });
    expect(screen.getByTestId("change-log-footer")).toContainElement(option);
    expect(option.querySelector("svg")).not.toBeNull();
    fireEvent.keyDown(option, { key: "Escape" });
    expect(option).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId("select-items-per-page-option-20")).not.toBeInTheDocument();
    size(10);
    expect(screen.queryByTestId("select-items-per-page-option-10")).not.toBeInTheDocument();
  });

  it("retains the non-keyboard timestamp div and remount defaults", () => {
    const view = render(<HistoryContent />);
    const header = screen.getByTestId("th-timestamp");
    expect(header.tagName).toBe("DIV");
    expect(header).not.toHaveAttribute("tabindex");
    fireEvent.keyDown(header, { key: "Enter" });
    fireEvent.keyDown(header, { key: " " });
    expect(ids()).toEqual(range(1, 20));
    size(10);
    search("Field-40");
    view.unmount();
    render(<HistoryContent />);
    expect(ids()).toEqual(range(1, 20));
    expect(screen.getByTestId("input-search-change-log")).toHaveValue("");
  });
});
