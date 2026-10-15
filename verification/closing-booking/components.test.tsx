import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClosingContent } from "@/components/loan/ClosingContent";
import { BookingContent } from "@/components/loan/BookingContent";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-14T16:00:00Z")); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

it.each(["", "not a date", "10/17/2026", "01/01/1900", "12/31/2099"])(
  "saves arbitrary date %j and both checkbox values, then discards the next session", value => {
    render(<ClosingContent />);
    const input = screen.getByTestId("input-closing-date");
    const checkbox = screen.getByRole("checkbox", { name: "Pre-closing review complete" });
    expect(input).toBeDisabled();
    expect(input).toHaveValue("");
    expect(input).toHaveAccessibleName("");
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    click("Edit");
    fireEvent.change(input, { target: { value } });
    fireEvent.click(checkbox);
    click("Save Changes");
    expect(input).toHaveValue(value);
    expect(checkbox).toBeChecked();
    expect(input).toBeDisabled();
    click("Edit");
    fireEvent.change(input, { target: { value: "discard me" } });
    fireEvent.click(checkbox);
    click("Discard Changes");
    expect(input).toHaveValue(value);
    expect(checkbox).toBeChecked();
    click("Edit");
    fireEvent.click(checkbox);
    click("Save Changes");
    expect(checkbox).not.toBeChecked();
  },
);

it("uses the real calendar: focus, navigation, weekends, selection, Escape, outside and disable", () => {
  render(<ClosingContent />);
  const input = screen.getByTestId("input-closing-date");
  const trigger = screen.getByRole("button", { name: "Open calendar" });
  expect(trigger).toBeDisabled();
  click("Edit");
  act(() => input.focus());
  expect(screen.getByRole("dialog", { name: "Date picker" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Saturday, October 17th/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Sunday, October 18th/i })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /next month/i }));
  expect(screen.getByText("November 2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /previous month/i }));
  fireEvent.click(screen.getByRole("button", { name: /Thursday, October 15th/i }));
  expect(input).toHaveValue("10/15/2026");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  click("Open calendar");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  act(() => input.focus());
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(input).toHaveFocus();
  click("Open calendar");
  click("Save Changes");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toBeDisabled();
});

it("keeps Enter in the textbox from saving and loses saved values on remount", () => {
  const view = render(<ClosingContent />);
  click("Edit");
  fireEvent.change(screen.getByTestId("input-closing-date"), { target: { value: "saved" } });
  fireEvent.keyDown(screen.getByTestId("input-closing-date"), { key: "Enter" });
  expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  click("Save Changes");
  view.unmount();
  render(<ClosingContent />);
  expect(screen.getByTestId("input-closing-date")).toHaveValue("");
});

it("cycles dots at 400ms, ignores repeated activation, and completes only at 5000ms", () => {
  render(<BookingContent />);
  const button = screen.getByRole("button", { name: "Book Loan" });
  expect(screen.queryByTestId("text-booking-status")).not.toBeInTheDocument();
  click("Book Loan");
  expect(button).not.toBeDisabled();
  expect(button).toHaveAttribute("aria-disabled", "true");
  act(() => button.focus());
  expect(button).toHaveFocus();
  expect(screen.getByTestId("text-booking-status")).toHaveTextContent(/^Booking Loan\.$/);
  advance(399);
  expect(screen.getByTestId("text-booking-status")).toHaveTextContent(/^Booking Loan\.$/);
  advance(1);
  expect(screen.getByTestId("text-booking-status")).toHaveTextContent(/^Booking Loan\.\.$/);
  advance(400);
  expect(screen.getByTestId("text-booking-status")).toHaveTextContent(/^Booking Loan\.\.\.$/);
  advance(400);
  expect(screen.getByTestId("text-booking-status")).toHaveTextContent(/^Booking Loan\.$/);
  click("Book Loan");
  expect(vi.getTimerCount()).toBe(2);
  advance(3799);
  expect(screen.queryByTestId("text-booking-confirmation")).not.toBeInTheDocument();
  advance(1);
  expect(screen.getByTestId("text-booking-confirmation")).toHaveTextContent("Loan successfully booked: 10/14/2026 04:00 PM");
  expect(screen.queryByTestId("text-booking-status")).not.toBeInTheDocument();
  expect(button).toHaveAttribute("aria-disabled", "false");
  expect(vi.getTimerCount()).toBe(0);
  vi.setSystemTime(new Date("2026-10-14T17:30:00Z"));
  click("Book Loan");
  expect(screen.queryByTestId("text-booking-confirmation")).not.toBeInTheDocument();
  advance(5000);
  expect(screen.getByTestId("text-booking-confirmation")).toHaveTextContent("10/14/2026 05:30 PM");
});

it.each([
  ["2026-10-14T11:59:55Z", "10/14/2026 12:00 PM"],
  ["2026-10-14T23:59:55Z", "10/15/2026 12:00 AM"],
])("formats completion clock at noon/midnight %s", (start, expected) => {
  vi.setSystemTime(new Date(start));
  render(<BookingContent />);
  click("Book Loan");
  advance(5000);
  expect(screen.getByTestId("text-booking-confirmation")).toHaveTextContent(expected);
});

it("clears both timers mid-booking; remount is idle, not resumed", () => {
  const view = render(<BookingContent />);
  click("Book Loan");
  advance(2500);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  advance(5000);
  render(<BookingContent />);
  expect(screen.queryByTestId("text-booking-confirmation")).not.toBeInTheDocument();
  expect(screen.queryByTestId("text-booking-status")).not.toBeInTheDocument();
});

it("owns no API or storage writes during editor save/discard or booking", () => {
  const fetchSpy = vi.fn(() => { throw new Error("Unexpected owned request"); });
  vi.stubGlobal("fetch", fetchSpy);
  const writes = ["setItem", "removeItem", "clear"].map(method =>
    vi.spyOn(Storage.prototype, method as "setItem"));
  const view = render(<><ClosingContent /><BookingContent /></>);
  click("Edit");
  fireEvent.change(screen.getByTestId("input-closing-date"), { target: { value: "arbitrary" } });
  click("Save Changes");
  click("Edit");
  click("Discard Changes");
  click("Book Loan");
  advance(5000);
  view.unmount();
  expect(fetchSpy).not.toHaveBeenCalled();
  writes.forEach(spy => expect(spy).not.toHaveBeenCalled());
});
