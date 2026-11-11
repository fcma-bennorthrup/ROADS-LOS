import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StockContent } from "../StockContent";
import { applicationStore } from "@/lib/loan-application-store";
import type { LoanApplication } from "@shared/loan-application";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("defaults to the primary borrower and saves or discards stock voter changes", async () => {
  const document = { loan: { id: "stock-test" }, borrowers: [
    { id: "primary", name: "Primary Borrower", isPrimary: true },
    { id: "secondary", name: "Second Borrower", isPrimary: false },
  ], sections: {}, generation: 0, revision: 0, mode: "empty" } as unknown as LoanApplication;
  applicationStore.install(document);
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    const { section, value } = JSON.parse(String(options.body));
    document.sections[section] = value;
    document.revision++;
    return new Response(JSON.stringify(document));
  }));
  const view = render(<StockContent />);
  const dropdown = () => screen.getByTestId("select-stock-voter");
  expect(dropdown()).toBeDisabled();
  expect(dropdown()).toHaveTextContent("Primary Borrower");
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(dropdown());
  fireEvent.click(screen.getByText("Second Borrower"));
  fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));
  expect(dropdown()).toHaveTextContent("Primary Borrower");
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(dropdown());
  fireEvent.click(screen.getByText("Second Borrower"));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await act(() => applicationStore.flush());
  expect(document.sections.stock).toEqual({ voterId: "secondary" });
  view.unmount();
  applicationStore.install(JSON.parse(JSON.stringify(document)));
  render(<StockContent />);
  expect(dropdown()).toHaveTextContent("Second Borrower");
  expect(dropdown()).toBeDisabled();
});
