import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { toast, dismissToasts } from "@/hooks/use-toast";
import { Toaster } from "./toaster";

afterEach(() => { act(() => dismissToasts()); cleanup(); vi.useRealTimers(); });

it("shows the existing success style and can be dismissed manually", () => {
  render(<Toaster />);
  act(() => { toast({ variant: "success", title: "Loan withdrawn successfully", duration: 6000 }); });
  const notification = screen.getByTestId("toast-success");
  expect(notification).toHaveTextContent("Loan withdrawn successfully");
  expect(within(notification).getByTestId("icon-toast-success")).toBeInTheDocument();
  fireEvent.click(within(notification).getByRole("button", { name: "Dismiss notification" }));
  expect(screen.queryByTestId("toast-success")).not.toBeInTheDocument();
});

it("automatically dismisses after six seconds", () => {
  vi.useFakeTimers();
  render(<Toaster />);
  act(() => { toast({ variant: "success", title: "Loan withdrawn successfully", duration: 6000 }); });
  act(() => vi.advanceTimersByTime(5999));
  expect(screen.getByTestId("toast-success")).toHaveAttribute("data-state", "open");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByTestId("toast-success")).not.toBeInTheDocument();
});
