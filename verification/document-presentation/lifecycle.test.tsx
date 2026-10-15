import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentSection } from "../../client/src/components/loan/DisclosureDocumentsContent";

const props = {
  title: "Synthetic Document", idleText: "Idle", generatingText: "Generating",
  generateLabel: "Generate", testIdPrefix: "fixture",
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T16:00:00Z"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const generate = () => fireEvent.click(screen.getByText("Generate"));

describe("document presentation preservation", () => {
  it("retains the scheduled callback and cancels local generation on unmount/reset", () => {
    const original = vi.fn(), replacement = vi.fn();
    const view = render(<DocumentSection {...props} onGenerated={original} />);
    generate();
    view.rerender(<DocumentSection {...props} onGenerated={replacement} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(original).toHaveBeenCalledTimes(1);
    expect(replacement).not.toHaveBeenCalled();
    generate();
    view.rerender(<DocumentSection {...props} resetVersion={1} onGenerated={replacement} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByTestId("text-fixture-status")).toHaveTextContent("Idle");
    expect(replacement).not.toHaveBeenCalled();
    generate();
    view.unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(replacement).not.toHaveBeenCalled();
  });

  it("calls delivery before stamping, refreshes repeated delivery, and retains it during regeneration", () => {
    const observed: string[] = [];
    render(<DocumentSection {...props} secondaryActions={[{
      label: "Deliver", marksDelivered: true,
      onClick: () => observed.push(screen.queryByTestId("text-fixture-delivered")?.textContent ?? "absent"),
    }]} />);
    const deliver = screen.getByText("Deliver");
    deliver.focus();
    expect(deliver).toHaveFocus();
    expect(deliver).not.toBeDisabled();
    fireEvent.click(deliver);
    expect(observed).toEqual([]);
    generate();
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(deliver);
    expect(observed).toEqual(["absent"]);
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(deliver);
    expect(observed[1]).toContain("04:00 PM");
    expect(screen.getByTestId("text-fixture-delivered")).toHaveTextContent("04:01 PM");
    generate();
    expect(screen.getByTestId("text-fixture-delivered")).toHaveTextContent("04:01 PM");
    fireEvent.click(deliver);
    expect(observed).toHaveLength(2);
  });

  it("leaves PDF access enabled on retained storage errors and orders callback before retained delivery", () => {
    const order: string[] = [];
    const progress = {
      generationState: "generated" as const, lastGenerated: "2026-10-14T16:00:00Z",
      lastDelivered: null, error: null as string | null,
      generate: vi.fn(), deliver: () => order.push("stamp"),
    };
    const actions = [
      { label: "View", onClick: () => order.push("view") },
      { label: "Deliver", marksDelivered: true, onClick: () => order.push("callback") },
    ];
    const view = render(<DocumentSection {...props} retainedProgress={progress} secondaryActions={actions} />);
    fireEvent.click(screen.getByText("Deliver"));
    expect(order).toEqual(["callback", "stamp"]);
    view.rerender(<DocumentSection {...props} retainedProgress={{ ...progress, error: "Storage failure" }} secondaryActions={actions} />);
    fireEvent.click(screen.getByText("View"));
    fireEvent.click(screen.getByText("Deliver"));
    generate();
    expect(order).toEqual(["callback", "stamp", "view"]);
    expect(progress.generate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Storage failure");
  });

  it("keeps local progress alive when temporarily displaying retained progress", () => {
    const completed = vi.fn();
    const view = render(<DocumentSection {...props} onGenerated={completed} />);
    generate();
    view.rerender(<DocumentSection {...props} onGenerated={completed} retainedProgress={{
      generationState: "idle", lastGenerated: null, lastDelivered: null, error: null,
      generate() {}, deliver() {},
    }} />);
    expect(screen.getByTestId("text-fixture-status")).toHaveTextContent("Idle");
    act(() => vi.advanceTimersByTime(5000));
    expect(completed).toHaveBeenCalledTimes(1);
    view.rerender(<DocumentSection {...props} onGenerated={completed} />);
    expect(screen.getByTestId("text-fixture-status")).toHaveTextContent("Last Generated: 10/14/2026 04:00 PM");
  });
});
