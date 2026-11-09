import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "./toaster";

function Fixture() {
  const { toast } = useToast();
  return <><button onClick={() => toast({ title: "Credit is frozen", description: "Lift the freeze and try again.", variant: "error", persistent: true })}>Frozen</button>
    <button onClick={() => toast({ title: "Other message" })}>Other</button><Toaster /></>;
}
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("keeps the error visible beyond normal timeout and other toasts, until its close icon is clicked", () => {
  vi.useFakeTimers();
  render(<Fixture />);
  fireEvent.click(screen.getByRole("button", { name: "Frozen" }));
  act(() => vi.advanceTimersByTime(60_000));
  expect(screen.getByTestId("toast-error")).toHaveAttribute("data-state", "open");
  fireEvent.click(screen.getByRole("button", { name: "Other" }));
  expect(screen.getByTestId("toast-error")).toHaveTextContent("Credit is frozen");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.getByTestId("toast-error")).toHaveAttribute("data-state", "open");
  fireEvent.click(screen.getByRole("button", { name: "Frozen" }));
  expect(screen.getAllByTestId("toast-error")).toHaveLength(1);
  fireEvent.click(within(screen.getByTestId("toast-error")).getByRole("button", { name: "Dismiss notification" }));
  act(() => vi.advanceTimersByTime(400));
  expect(screen.queryByTestId("toast-error")).not.toBeInTheDocument();
});
