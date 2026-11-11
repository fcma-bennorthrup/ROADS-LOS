import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ClosingContent } from "../ClosingContent";
import { applicationStore } from "@/lib/loan-application-store";
import type { LoanApplication } from "@shared/loan-application";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("edits, saves, restores and discards the disbursement date without changing existing closing data", async () => {
  const document = {
    loan: { id: "closing-date-test" }, borrowers: [],
    sections: { "closing-details": { closingDate: "11/10/2026", preClosingReviewComplete: true } },
    generation: 0, revision: 0, mode: "empty",
  } as unknown as LoanApplication;
  applicationStore.install(document);
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    const { section, value } = JSON.parse(String(options.body));
    expect(section).toBe("closing-details");
    document.sections[section] = value;
    document.revision++;
    return new Response(JSON.stringify(document));
  }));
  const view = render(<ClosingContent />);
  const date = () => screen.getByTestId("input-disbursement-date");
  expect(date()).toHaveValue("");
  expect(date()).toBeDisabled();
  fireEvent.click(screen.getByTestId("button-edit-closing-details"));
  expect(date()).toBeEnabled();
  fireEvent.change(date(), { target: { value: "11/12/2026" } });
  fireEvent.click(screen.getByTestId("button-save-closing-details"));
  await act(() => applicationStore.flush());
  expect(date()).toBeDisabled();
  expect(document.sections["closing-details"]).toEqual({
    closingDate: "11/10/2026", disbursementDate: "11/12/2026", preClosingReviewComplete: true,
  });
  view.unmount();
  applicationStore.install(JSON.parse(JSON.stringify(document)));
  render(<ClosingContent />);
  expect(date()).toHaveValue("11/12/2026");
  fireEvent.click(screen.getByTestId("button-edit-closing-details"));
  fireEvent.change(date(), { target: { value: "11/15/2026" } });
  fireEvent.click(screen.getByTestId("button-discard-closing-details"));
  expect(date()).toHaveValue("11/12/2026");
  fireEvent.click(screen.getByTestId("button-edit-closing-details"));
  fireEvent.change(date(), { target: { value: "11/16/2026" } });
  fireEvent.click(screen.getByTestId("button-save-closing-details"));
  await act(() => applicationStore.flush());
  expect(document.sections["closing-details"]).toMatchObject({ disbursementDate: "11/16/2026" });
});

it("defaults hardship off and supports save, reload, discard, and uncheck", async () => {
  const document = {
    loan: { id: "hardship-test" }, borrowers: [],
    sections: { "closing-details": { closingDate: "11/10/2026", preClosingReviewComplete: true } },
    generation: 0, revision: 0, mode: "empty",
  } as unknown as LoanApplication;
  applicationStore.install(document);
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    const { section, value } = JSON.parse(String(options.body));
    document.sections[section] = value;
    document.revision++;
    return new Response(JSON.stringify(document));
  }));
  const view = render(<ClosingContent />);
  const checkbox = () => screen.getByRole("checkbox", { name: "Bona Fide Financial Hardship" });
  expect(checkbox()).not.toBeChecked();
  expect(checkbox()).toBeDisabled();
  fireEvent.click(screen.getByTestId("button-edit-closing-details"));
  expect(checkbox()).toBeEnabled();
  fireEvent.click(checkbox());
  fireEvent.click(screen.getByTestId("button-save-closing-details"));
  await act(() => applicationStore.flush());
  expect(checkbox()).toBeDisabled();
  view.unmount();
  applicationStore.install(JSON.parse(JSON.stringify(document)));
  render(<ClosingContent />);
  expect(checkbox()).toBeChecked();
  fireEvent.click(screen.getByTestId("button-edit-closing-details"));
  fireEvent.click(checkbox());
  fireEvent.click(screen.getByTestId("button-discard-closing-details"));
  expect(checkbox()).toBeChecked();
  fireEvent.click(screen.getByTestId("button-edit-closing-details"));
  fireEvent.click(checkbox());
  fireEvent.click(screen.getByTestId("button-save-closing-details"));
  await act(() => applicationStore.flush());
  expect(document.sections["closing-details"]).toEqual({
    closingDate: "11/10/2026", preClosingReviewComplete: true, bonaFideFinancialHardship: false,
  });
});
