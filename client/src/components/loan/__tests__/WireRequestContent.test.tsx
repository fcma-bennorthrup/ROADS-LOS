import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  current: { loan: { id: "wire-test" }, generation: 0, revision: 1, sections: {} } as any,
  request: vi.fn(), flush: vi.fn(), install: vi.fn(), toast: vi.fn(), dirty: false,
}));
vi.mock("@/contexts/loan-application-context", () => ({
  useLoanState: () => [mocks.current.sections["wire-request"] ?? null],
}));
vi.mock("@/lib/loan-application-store", () => ({
  applicationRequest: mocks.request,
  applicationStore: { get document() { return mocks.current; }, get dirty() { return mocks.dirty; }, flush: mocks.flush, install: mocks.install },
}));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
import { WireRequestContent } from "../WireRequestContent";
beforeEach(() => {
  vi.clearAllMocks(); mocks.current.sections = {}; mocks.dirty = false;
  mocks.flush.mockResolvedValue(undefined);
});
it("saves a loan-scoped wire request and displays the saved receipt", async () => {
  const next = { ...mocks.current, sections: { "wire-request": { requestedAt: "2026-11-12T12:00:00Z", requestedBy: "Prototype user" } } };
  mocks.request.mockResolvedValue(next);
  const view = render(<WireRequestContent />);
  fireEvent.click(screen.getByRole("button", { name: "Wire Request" }));
  await waitFor(() => expect(mocks.install).toHaveBeenCalledWith(next));
  expect(mocks.request.mock.calls[0][0]).toBe("wire-test");
  expect(JSON.parse(mocks.request.mock.calls[0][2].body)).toMatchObject({ section: "wire-request", generation: 0, revision: 1 });
  mocks.current = next; view.rerender(<WireRequestContent />);
  expect(screen.getByText(/Wire requested by Prototype user/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Wire Request" })).toBeDisabled();
});
it("does not show success or install data on a failed save", async () => {
  mocks.request.mockRejectedValue(new Error("Save failed"));
  render(<WireRequestContent />);
  fireEvent.click(screen.getByRole("button", { name: "Wire Request" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
  expect(mocks.install).not.toHaveBeenCalled();
  expect(mocks.toast).not.toHaveBeenCalled();
});
it("preserves unsaved edits by requiring them to be resolved", async () => {
  mocks.dirty = true;
  render(<WireRequestContent />);
  fireEvent.click(screen.getByRole("button", { name: "Wire Request" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Save or discard");
  expect(mocks.request).not.toHaveBeenCalled();
});
