import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { records } from "../history/fixtures";
import { filterAndSortHistory, parseTimestamp } from "@/components/loan/history-transforms";
// Disposable runner reconstructs the exact pinned pre-extraction source.
// @ts-expect-error Test-only module generated in the disposable copy.
import { HistoryContent as Before } from "./Baseline.tsx?synthetic";
// @ts-expect-error Test-only synthetic records, no production injection API.
import { HistoryContent as After } from "@/components/loan/HistoryContent.tsx?synthetic";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("wouter", () => ({ useLocation: () => ["/loans/2/history", navigate] }));
afterEach(() => { cleanup(); navigate.mockClear(); vi.useRealTimers(); });

// Execute the original parser/memo body from the hash-checked baseline rather
// than reimplementing a second oracle with possibly different semantics.
const source = readFileSync("verification/history-extraction/Baseline.tsx", "utf8");
const parser = source.slice(source.indexOf("function parseTimestamp"), source.indexOf("interface HistoryContentProps"));
const body = source.split("const filteredAndSortedData = useMemo(() => {")[1].split("}, [searchQuery, sortDirection]);")[0];
const original = new Function(ts.transpile(
  `${parser}\nreturn { parseTimestamp, filter: (CHANGE_LOG, searchQuery, sortDirection) => {${body}} };`,
  { target: ts.ScriptTarget.ES2020 },
))();

it("compares all 40 records, seven fields, whitespace, directions, sizes and pages", () => {
  expect(records).toHaveLength(40);
  const fields = ["field", "previousValue", "newValue", "changedBy", "position", "timestamp", "section"] as const;
  const searches = ["", " ", "\t\n", "not-a-match", " field ", ...records.flatMap(r => fields.map(k => r[k].toUpperCase()))];
  const unchanged = JSON.stringify(records);
  for (const direction of ["asc", "desc"] as const) {
    for (const search of searches) {
      const expected = original.filter(records, search, direction);
      const actual = filterAndSortHistory(records, search, direction);
      expect(actual).toEqual(expected);
      expect(actual).not.toBe(records);
      for (const size of [10, 20, 50]) {
        for (let page = 1; page <= Math.max(1, Math.ceil(expected.length / size)); page++) {
          const start = (page - 1) * size;
          expect(actual.slice(start, start + size)).toEqual(expected.slice(start, start + size));
        }
      }
    }
  }
  expect(JSON.stringify(records)).toBe(unchanged);
});

it("preserves equal-key order and invalid-date sort behavior without mutation", () => {
  for (const timestamp of ["03/15/2026 12:00 PM", "bad/date/value 10:00 PM"]) {
    const entries = [records[9], records[2], records[18]].map(r => ({ ...r, timestamp }));
    for (const direction of ["asc", "desc"] as const) {
      expect(filterAndSortHistory(entries, "", direction)).toEqual(original.filter(entries, "", direction));
      expect(filterAndSortHistory(entries, "", direction).map(r => r.id)).toEqual(entries.map(r => r.id));
    }
  }
});

it("preserves local Date rollover, NaN and thrown parser failures", () => {
  for (const value of ["", "broken", "03/15/2026", "03/15/2026  12:00 PM",
    "bad/date/value 10:00 PM", "02/31/2026 13:61 PM", "13/40/2026 25:99 AM",
    "01/01/0099 12:00 AM", "03/15/2026 12:00 AM", "03/15/2026 12:00 PM",
    "03/15/2026 02:00 pm", "03/08/2026 02:30 AM", "11/01/2026 01:30 AM"]) {
    const outcome = (fn: (s: string) => number) => {
      try { return { value: fn(value) }; }
      catch (error) { return { name: (error as Error).name, message: (error as Error).message }; }
    };
    expect(outcome(parseTimestamp)).toEqual(outcome(original.parseTimestamp));
  }
});

it("keeps exact DOM, order, focus, reset handlers, dropdown and navigation sequences", () => {
  function exercise(Component: typeof After) {
    const snapshots: unknown[] = [];
    const view = render(<Component loanId="2" />);
    const snapshot = () => snapshots.push({
      dom: view.container.innerHTML,
      focus: document.activeElement?.getAttribute("data-testid"),
      calls: [...navigate.mock.calls],
    });
    const click = (id: string) => { fireEvent.click(screen.getByTestId(id)); snapshot(); };
    const search = (value: string) => {
      screen.getByTestId("input-search-change-log").focus();
      fireEvent.change(screen.getByTestId("input-search-change-log"), { target: { value } });
      snapshot();
    };
    snapshot();
    click("button-next-page");
    click("th-timestamp");
    for (const size of [10, 20, 50, 50]) {
      click("select-items-per-page");
      fireEvent.keyDown(screen.getByTestId("select-items-per-page"), { key: "Escape" });
      snapshot();
      click(`select-items-per-page-option-${size}`);
      click("button-next-page");
    }
    for (const value of ["Fees", " ", " Fees ", "not-a-match", ""]) search(value);
    click("select-items-per-page");
    fireEvent.mouseDown(document.body);
    snapshot();
    fireEvent.keyDown(screen.getByTestId("th-timestamp"), { key: "Enter" });
    snapshot();
    for (const section of ["Borrower Information", "Loan Details", "Collateral", "Product & Pricing", "Fees", "Decisioning"]) {
      fireEvent.click(screen.getAllByRole("button", { name: section, exact: true })[0]);
      snapshot();
    }
    view.unmount();
    navigate.mockClear();
    return snapshots;
  }
  expect(exercise(After)).toEqual(exercise(Before));
});
