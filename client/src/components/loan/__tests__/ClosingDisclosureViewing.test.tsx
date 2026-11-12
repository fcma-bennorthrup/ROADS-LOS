import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClosingDocumentsContent } from "../DocumentsContent";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { closingDisclosureStorageKey, loadClosingDisclosures, simulateClosingDisclosureViewed } from "@/lib/closing-disclosure-history";

const older = { id: 1, generatedAt: "2026-11-10T12:00:00Z", deliveredAt: "2026-11-10T13:00:00Z" };
const newer = { id: 2, generatedAt: "2026-11-11T12:00:00Z", deliveredAt: null };
const key = closingDisclosureStorageKey("viewing");
const row = (id: number) => within(screen.getByTestId(`row-closing-disclosure-${id}`));
const mount = () => render(<ChecklistProvider><ClosingDocumentsContent loanId="viewing" /></ChecklistProvider>);

describe("Closing Disclosure viewing simulation", () => {
  it("keeps old Needed while only generated, supersedes on delivery, completes newest and retains it after reload", async () => {
    localStorage.setItem(key, JSON.stringify([newer, older]));
    const view = mount();
    expect(row(1).getByText("Needed")).toBeVisible();
    expect(row(1).getByLabelText("Delivery tracking")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Deliver Closing Disclosure" }));
    expect(row(1).queryByText("Needed")).toBeNull();
    expect(row(1).queryByLabelText("Delivery tracking")).toBeNull();
    expect(row(1).getByTestId("text-delivery-method-1")).toHaveTextContent("Blend");
    expect(row(2).getByText("Needed")).toBeVisible();
    await act(() => simulateClosingDisclosureViewed("viewing"));
    expect(row(2).getByText("Complete")).toHaveClass("is-complete");
    expect(loadClosingDisclosures("viewing")[1]).toEqual(older);
    view.unmount(); mount();
    expect(row(2).getByText("Complete")).toBeVisible();
    expect(row(1).queryByText("Needed")).toBeNull();
  });

  it("views latest delivered rather than newest generated and preserves earlier completed records", async () => {
    localStorage.setItem(key, JSON.stringify([newer, older]));
    await simulateClosingDisclosureViewed("viewing");
    mount();
    expect(row(1).getByText("Complete")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Deliver Closing Disclosure" }));
    expect(row(1).getByText("Complete")).toBeVisible();
    expect(row(2).getByText("Needed")).toBeVisible();
  });

  it("rejects a queued simulation after reset and never views the replacement", async () => {
    localStorage.setItem(key, JSON.stringify([older]));
    let commit!: () => void;
    Object.defineProperty(navigator, "locks", { configurable: true, value: {
      request: (_key: string, write: () => void) => new Promise<void>((resolve, reject) => {
        commit = () => { try { write(); resolve(); } catch (error) { reject(error); } };
      }),
    } });
    const pending = simulateClosingDisclosureViewed("viewing");
    localStorage.setItem(key, JSON.stringify({ records: [older], resetToken: "new-reset" }));
    commit();
    await expect(pending).rejects.toThrow("changed");
    expect(loadClosingDisclosures("viewing")[0].viewedAt).toBeUndefined();
  });

  it("rejects no delivery, repeated viewing and keeps another loan untouched", async () => {
    localStorage.setItem(key, JSON.stringify([newer]));
    await expect(simulateClosingDisclosureViewed("viewing")).rejects.toThrow("no delivered");
    localStorage.setItem(key, JSON.stringify([older]));
    const otherKey = closingDisclosureStorageKey("other");
    localStorage.setItem(otherKey, JSON.stringify([older]));
    await simulateClosingDisclosureViewed("viewing");
    const saved = localStorage.getItem(key);
    await expect(simulateClosingDisclosureViewed("viewing")).rejects.toThrow("no delivered");
    expect(localStorage.getItem(key)).toBe(saved);
    expect(localStorage.getItem(otherKey)).toBe(JSON.stringify([older]));
  });
});
