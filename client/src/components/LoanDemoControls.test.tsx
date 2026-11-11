import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoanDemoControls } from "./LoanDemoControls";

const mocks = vi.hoisted(() => ({
  store: { document: { loan: { id: "demo", loanNumber: "Demo" }, generation: 1, revision: 2, sections: {} as Record<string, unknown>,
    businessRules: { trid: { status: "not-triggered" } } },
    dirty: false, pending: 0, error: "", flush: vi.fn(), install: vi.fn(), write: vi.fn() },
  request: vi.fn(),
}));
vi.mock("@/contexts/loan-application-context", () => ({ useApplicationStatus: () => mocks.store }));
vi.mock("@/lib/loan-application-store", () => ({ applicationRequest: mocks.request }));
vi.mock("@/lib/blend-demo-fixture", () => ({
  tridDemoSections: () => ({ "evaluation-1": { estimatedValue: "195000" } }),
  blendDemoSections: (_id: string, count: number) => ({ income: Array(count).fill({}) }),
}));
beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  mocks.store.document.businessRules.trid.status = "not-triggered";
  mocks.store.dirty = false;
  mocks.store.document.sections = {};
});

describe("Trigger TRID button", () => {
  it("describes and confirms a Salesforce baseline reset", async () => {
    mocks.request.mockResolvedValueOnce({ loan: { id: "demo" }, generation: 2, revision: 3 });
    render(<LoanDemoControls />);
    const card = within(screen.getByTestId("demo-reset-card"));
    expect(card.getByText("Salesforce opportunity")).toBeInTheDocument();
    expect(card.getByText("Return this loan to its original Salesforce opportunity data. Everything added since is removed.")).toBeInTheDocument();
    fireEvent.click(card.getByRole("button", { name: "Reset All Application Data" }));
    fireEvent.click(card.getByRole("button", { name: "Confirm reset" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalled());
    expect(JSON.parse(mocks.request.mock.calls[0][2].body)).toMatchObject({
      action: "reset", confirmed: true, generation: 1, revision: 2,
    });
  });
  it.each([
    ["Force denial", "force-denial"],
  ])("persists %s for the current loan", async (label, mode) => {
    const view = render(<LoanDemoControls />);
    expect(screen.getByRole("radio", { name: "Force approval" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "Real EDE Simulation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: label }));
    await waitFor(() => expect(mocks.store.write).toHaveBeenCalledWith("decision-mode", mode));
    expect(mocks.store.flush).toHaveBeenCalled();
    expect(mocks.store.install).not.toHaveBeenCalled();
    mocks.store.document.sections["decision-mode"] = mode;
    view.unmount();
    render(<LoanDemoControls />);
    expect(screen.getByRole("radio", { name: label })).toBeChecked();
  });
  it("saves the loan's frozen-credit toggle without replacing its data", async () => {
    const view = render(<LoanDemoControls />);
    fireEvent.click(screen.getByRole("switch", { name: "Credit frozen" }));
    await waitFor(() => expect(mocks.store.write).toHaveBeenCalledWith("credit-frozen", true));
    expect(mocks.store.flush).toHaveBeenCalled();
    expect(mocks.store.install).not.toHaveBeenCalled();
    mocks.store.document.sections["credit-frozen"] = true;
    view.unmount();
    render(<LoanDemoControls />);
    expect(screen.getByRole("switch", { name: "Credit frozen" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("switch", { name: "Credit frozen" }));
    await waitFor(() => expect(mocks.store.write).toHaveBeenCalledWith("credit-frozen", false));
  });
  it.each([
    ["Reset TRID Data", "Confirm reset", "trid-reset"],
    ["Manually Trigger TRID", "Confirm trigger", "trid-manual"],
  ])("offers and confirms %s after satisfaction", async (label, confirmation, action) => {
    mocks.store.document.businessRules.trid.status = "satisfied";
    mocks.request.mockResolvedValue({ loan: { id: "demo" } });
    render(<LoanDemoControls />);
    expect(screen.getByRole("button", { name: "Reset TRID Data" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Manually Trigger TRID" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(mocks.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: confirmation }));
    await waitFor(() => expect(mocks.store.install).toHaveBeenCalled());
    expect(JSON.parse(mocks.request.mock.calls[0][2].body)).toEqual({
      action, generation: 1, revision: 2, confirmed: true,
    });
  });
  it("confirms the checklist-only reset without requesting import fixtures", async () => {
    mocks.request.mockResolvedValue({ loan: { id: "demo" } });
    render(<LoanDemoControls />);
    fireEvent.click(screen.getByRole("button", { name: "Reset Checklist Data" }));
    expect(mocks.request).not.toHaveBeenCalled();
    expect(within(screen.getByTestId("demo-checklist-card")).getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));
    await waitFor(() => expect(mocks.store.install).toHaveBeenCalled());
    expect(JSON.parse(mocks.request.mock.calls[0][2].body)).toEqual({
      action: "checklist", generation: 1, revision: 2, confirmed: true,
    });
  });
  it("replaces only the clicked button with an inline confirmation and restores it on cancel", () => {
    render(<LoanDemoControls />);
    fireEvent.click(screen.getByRole("button", { name: "Reset All Application Data" }));
    expect(screen.queryByRole("button", { name: "Reset All Application Data" })).toBeNull();
    expect(within(screen.getByTestId("demo-reset-card")).getByRole("alert")).toBeTruthy();
    expect(within(screen.getByRole("alert")).queryByText(/cannot be undone|saved and unsaved/i)).toBeNull();
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("bg-secondary");
    }
    for (const kind of ["reset", "blend", "trid", "decision", "credit-freeze", "checklist"]) {
      expect(screen.getByTestId(`demo-${kind}-card`).className).toContain("h-64");
    }
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "New Blend Import" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Reset All Application Data" })).toBeTruthy();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("moves confirmation to the newly selected card without running either action", () => {
    render(<LoanDemoControls />);
    fireEvent.click(screen.getByRole("button", { name: "Reset All Application Data" }));
    fireEvent.click(screen.getByRole("button", { name: "Trigger TRID" }));
    expect(within(screen.getByTestId("demo-reset-card")).queryByRole("alert")).toBeNull();
    expect(within(screen.getByTestId("demo-trid-card")).getByRole("alert")).toBeTruthy();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it.each([1, 2])("submits the selected %i borrower Blend import", async count => {
    mocks.request.mockResolvedValue({ loan: { id: "demo" } });
    render(<LoanDemoControls />);
    fireEvent.click(screen.getByRole("radio", { name: count === 1 ? "1 borrower" : "2 borrowers" }));
    fireEvent.click(screen.getByRole("button", { name: "New Blend Import" }));
    expect(mocks.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm replacement" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalled());
    expect(JSON.parse(mocks.request.mock.calls[0][2].body)).toMatchObject({
      action: "blend", borrowerCount: count, confirmed: true,
      sections: { income: Array(count).fill({}) },
    });
  });
  it("requires confirmation, then submits the current loan revision and demo fields", async () => {
    mocks.request.mockResolvedValue({ loan: { id: "demo" } });
    render(<LoanDemoControls />);
    fireEvent.click(screen.getByRole("button", { name: "Trigger TRID" }));
    expect(mocks.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save and trigger TRID" }));
    await waitFor(() => expect(mocks.store.install).toHaveBeenCalled());
    expect(mocks.request).toHaveBeenCalledWith("demo", "/demo", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ action: "trid", generation: 1, revision: 2, confirmed: true,
        sections: { "evaluation-1": { estimatedValue: "195000" } } }),
    }));
  });
});
