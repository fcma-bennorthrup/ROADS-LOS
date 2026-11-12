import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MoreOptionsMenu } from "@/components/AppHeader";
import { applicationStore } from "@/lib/loan-application-store";
import type { LoanApplication } from "@shared/loan-application";
import { toast } from "@/hooks/use-toast";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));
vi.mock("@/components/loan/SummaryDebugDialog", () => ({ SummaryDebugDialog: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("withdraws from the detail menu without losing drafts or desynchronizing later saves", async () => {
  const document = { loan: { id: "detail-withdraw", loanNumber: "123" }, borrowers: [],
    sections: { "closing-details": { closingDate: "11/11/2026" } },
    generation: 0, revision: 1, mode: "empty" } as unknown as LoanApplication;
  applicationStore.install(document);
  applicationStore.markDraft("borrower-primary", true);
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    const payload = JSON.parse(String(options.body));
    expect(payload.revision).toBe(document.revision);
    document.sections[payload.section] = payload.value;
    document.revision++;
    return new Response(JSON.stringify(document));
  }));
  render(<MoreOptionsMenu loanActive onGitHubSync={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "More options" }));
  fireEvent.click(screen.getByTestId("menu-item-withdraw-loan"));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByRole("button", { name: "Withdraw Loan" })).toBeDisabled();
  fireEvent.click(dialog.getByRole("checkbox"));
  fireEvent.click(dialog.getByRole("button", { name: "Withdraw Loan" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(toast).toHaveBeenCalledWith({ variant: "success", title: "Loan withdrawn successfully", duration: 6000 });
  expect(applicationStore.document?.sections.withdrawal).toEqual({ acknowledged: true });
  expect(applicationStore.dirty).toBe(true);
  expect(applicationStore.document?.sections["closing-details"]).toEqual({ closingDate: "11/11/2026" });
  expect(screen.getByRole("button", { name: "More options" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "More options" }));
  expect(screen.getByTestId("menu-item-withdraw-loan")).toBeDisabled();
  applicationStore.write("stock", { voterId: "borrower-1" });
  await applicationStore.flush();
  expect(document.revision).toBe(3);
  expect(applicationStore.document?.sections.withdrawal).toEqual({ acknowledged: true });
});

it("does not expose loan withdrawal in the Pipeline header menu", () => {
  render(<MoreOptionsMenu loanActive={false} onGitHubSync={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "More options" }));
  expect(screen.queryByTestId("menu-item-withdraw-loan")).toBeNull();
});
