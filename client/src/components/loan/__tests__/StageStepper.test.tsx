import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StageStepper } from "../LoanHeader";
import { applicationStore } from "@/lib/loan-application-store";
import type { LoanApplication } from "@shared/loan-application";
import { LOAN_STAGES } from "@shared/loan-stages";

vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function install(index = 0) {
  const state = { loan: { id: "stage-test", stage: LOAN_STAGES[index] }, borrowers: [],
    sections: {}, generation: 0, revision: 0, mode: "empty" } as unknown as LoanApplication;
  applicationStore.install(state);
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    const payload = JSON.parse(String(options.body));
    expect(payload.revision).toBe(state.revision);
    state.loan.stage = payload.stage;
    state.revision++;
    return new Response(JSON.stringify(state));
  }));
}

it("persists neighbouring stages with CAS and retains the saved stage on remount", async () => {
  install();
  const first = render(<StageStepper />);
  expect(first.container.querySelector('[aria-current="step"]')).toHaveTextContent("Customer Application");
  expect(screen.queryByText("Pre-Approval")).toBeNull();
  expect(screen.queryByText("Loan Setup")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Move loan stage forward" }));
  await waitFor(() => expect(first.container.querySelector('[aria-current="step"]')).toHaveTextContent("Decisioning"));
  await act(() => applicationStore.flush());
  expect(fetch).toHaveBeenCalledWith("/api/loans/stage-test/stage", expect.objectContaining({ method: "PUT", credentials: "include" }));
  first.unmount();
  const second = render(<StageStepper />);
  expect(second.container.querySelector('[aria-current="step"]')).toHaveTextContent("Decisioning");
});
it("stops at both endpoints without changing the chevron controls", async () => {
  install(0);
  const view = render(<StageStepper />);
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Move loan stage backward" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Move loan stage backward" }));
  expect(fetch).not.toHaveBeenCalled();
  act(() => install(7));
  expect(screen.getByRole("button", { name: "Move loan stage forward" })).toBeDisabled();
  expect(view.container.querySelector('[aria-current="step"]')).toHaveTextContent("Loan Certification");
});
it("shows stage-save failure without advancing the persisted step", async () => {
  install();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("Loan changed", { status: 409 })));
  const view = render(<StageStepper />);
  fireEvent.click(screen.getByRole("button", { name: "Move loan stage forward" }));
  await screen.findByRole("alert");
  expect(view.container.querySelector('[aria-current="step"]')).toHaveTextContent("Customer Application");
});
it("moves backward from Decisioning directly to Customer Application", async () => {
  install(3);
  const view = render(<StageStepper />);
  fireEvent.click(screen.getByRole("button", { name: "Move loan stage backward" }));
  await waitFor(() => expect(view.container.querySelector('[aria-current="step"]')).toHaveTextContent("Customer Application"));
});
it.each([1, 2])("does not rewrite older hidden stage %s on render", index => {
  install(index);
  const view = render(<StageStepper />);
  expect(view.container.querySelector('[aria-current="step"]')).toHaveTextContent("Customer Application");
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByText("Pre-Approval")).toBeNull();
  expect(screen.queryByText("Loan Setup")).toBeNull();
});
