import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BorrowerInformationContent } from "../BorrowerInformationContent";
import { applicationStore } from "@/lib/loan-application-store";
import type { LoanApplication } from "@shared/loan-application";
import { sectionSchemas } from "@shared/loan-contract";

vi.mock("../borrower-presentation/DeclarationsSection", () => ({ DeclarationsSection: () => null }));
vi.mock("../borrower-presentation/MilitarySection", () => ({ MilitarySection: () => null }));
vi.mock("../borrower-presentation/DemographicSection", () => ({ DemographicSection: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("defaults MLA off, saves it independently for each borrower, and discards edits", async () => {
  const document = {
    loan: { id: "mla-test" }, borrowers: [{}, {}],
    sections: { "borrower-primary": { firstName: "Test", lastName: "One" },
      "borrower-secondary": { firstName: "Test", lastName: "Two" } },
    generation: 0, revision: 0, mode: "blend",
  } as unknown as LoanApplication;
  applicationStore.install(document);
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    const { section, value } = JSON.parse(String(options.body));
    expect(sectionSchemas[section].safeParse(value).success).toBe(true);
    document.sections[section] = value;
    document.revision++;
    return new Response(JSON.stringify(document));
  }));
  const view = render(<BorrowerInformationContent />);
  const checkbox = () => screen.getByRole("checkbox", { name: "MLA" });
  expect(checkbox()).not.toBeChecked();
  expect(checkbox()).toBeDisabled();
  fireEvent.click(screen.getByTestId("borrower-info-button-edit"));
  expect(checkbox()).toBeEnabled();
  fireEvent.click(checkbox());
  fireEvent.click(screen.getByTestId("borrower-info-button-save"));
  await act(() => applicationStore.flush());
  expect(checkbox()).toBeChecked();
  expect(checkbox()).toBeDisabled();
  fireEvent.click(screen.getByTestId("tab-borrower-jane"));
  expect(checkbox()).not.toBeChecked();
  fireEvent.click(screen.getByTestId("borrower-info-button-edit"));
  fireEvent.click(checkbox());
  fireEvent.click(screen.getByTestId("borrower-info-button-discard"));
  expect(checkbox()).not.toBeChecked();
  fireEvent.click(screen.getByTestId("borrower-info-button-edit"));
  fireEvent.click(checkbox());
  fireEvent.click(screen.getByTestId("borrower-info-button-save"));
  await act(() => applicationStore.flush());
  view.unmount();
  applicationStore.install(JSON.parse(JSON.stringify(document)));
  render(<BorrowerInformationContent />);
  expect(checkbox()).toBeChecked();
  fireEvent.click(screen.getByTestId("tab-borrower-jane"));
  expect(checkbox()).toBeChecked();
  expect(checkbox()).toBeDisabled();
});
