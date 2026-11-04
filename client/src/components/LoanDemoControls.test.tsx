import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoanDemoControls } from "./LoanDemoControls";

const mocks = vi.hoisted(() => ({
  store: { document: { loan: { id: "demo", loanNumber: "Demo" }, generation: 1, revision: 2,
    businessRules: { trid: { status: "not-triggered" } } },
    dirty: false, pending: 0, error: "", flush: vi.fn(), install: vi.fn() },
  request: vi.fn(),
}));
vi.mock("@/contexts/loan-application-context", () => ({ useApplicationStatus: () => mocks.store }));
vi.mock("@/lib/loan-application-store", () => ({ applicationRequest: mocks.request }));
vi.mock("@/lib/blend-demo-fixture", () => ({ tridDemoSections: () => ({ "evaluation-1": { estimatedValue: "195000" } }) }));

describe("Trigger TRID button", () => {
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
