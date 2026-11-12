import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PipelineTridChip, tridCalendarDay } from "./PipelineTridChip";
import type { PipelineLoan } from "@shared/pipeline";

afterEach(() => { cleanup(); vi.useRealTimers(); });
const loan = (status = "required", triggeredAt = new Date(2026, 10, 12, 23).toISOString()) =>
  ({ tridStatus: status, tridTriggeredAt: triggeredAt } as PipelineLoan);
it.each([0, 1, 2, 3, 7])("renders day %s with the reference color treatment", day => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 12 + day, 23, 30));
  render(<PipelineTridChip loan={loan()} />);
  expect(screen.getByLabelText(`TRID day ${day}`)).toHaveClass(
    `pipeline-trid-${day === 0 ? "initial" : day < 3 ? "warning" : "late"}`);
});
it("counts calendar boundaries rather than elapsed hours", () => {
  expect(tridCalendarDay(new Date(2026, 10, 12, 23, 59).toISOString(), new Date(2026, 10, 13, 0, 1))).toBe(1);
  expect(tridCalendarDay("invalid", new Date())).toBeNull();
});
it("updates while open and hides on satisfaction or reset", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 12, 23, 59, 30));
  const view = render(<PipelineTridChip loan={loan()} />);
  expect(screen.getByText("Day 0")).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(60_000); });
  expect(screen.getByText("Day 1")).toBeInTheDocument();
  view.rerender(<PipelineTridChip loan={loan("satisfied")} />);
  expect(view.container).toBeEmptyDOMElement();
  view.rerender(<PipelineTridChip loan={loan("not-triggered", "")} />);
  expect(view.container).toBeEmptyDOMElement();
});
