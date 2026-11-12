import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WithdrawLoanAction } from "@/components/WithdrawLoanAction";
import { queryClient } from "@/lib/queryClient";
import type { PipelineLoan } from "@shared/pipeline";
import { sectionSchemas } from "@shared/loan-contract";
import { toast } from "@/hooks/use-toast";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const loan = { id: "withdraw-test", loanNumber: "123456", stage: "Customer Application" } as PipelineLoan;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); queryClient.clear(); });
async function openDialog() {
  fireEvent.keyDown(screen.getByRole("button", { name: "More actions for loan 123456" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Withdraw Loan" }));
  return within(await screen.findByRole("dialog"));
}
it("requires acknowledgment, cancels without saving, and persists a confirmed withdrawal", async () => {
  queryClient.setQueryData(["/api/loans"], [loan]);
  const request = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === "PUT") {
      expect(JSON.parse(String(options.body))).toEqual({
        section: "withdrawal", value: { acknowledged: true }, generation: 2, revision: 5,
      });
    }
    return new Response(JSON.stringify({ generation: 2, revision: 5 }));
  });
  vi.stubGlobal("fetch", request);
  render(<WithdrawLoanAction loan={loan} />);
  let dialog = await openDialog();
  expect(dialog.getByRole("button", { name: "Withdraw Loan" })).toBeDisabled();
  fireEvent.click(dialog.getByRole("checkbox"));
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  expect(request).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
  dialog = await openDialog();
  expect(dialog.getByRole("checkbox")).not.toBeChecked();
  fireEvent.click(dialog.getByRole("checkbox"));
  fireEvent.click(dialog.getByRole("button", { name: "Withdraw Loan" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(request).toHaveBeenCalledTimes(2);
  expect(toast).toHaveBeenCalledExactlyOnceWith({ variant: "success", title: "Loan withdrawn successfully", duration: 6000 });
  expect(queryClient.getQueryData<PipelineLoan[]>(["/api/loans"])?.[0].withdrawn).toBe(true);
});
it("keeps the modal open with an error when the save fails", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options?: RequestInit) =>
    new Response(JSON.stringify(options?.method === "PUT" ? { error: "Loan changed. Reload and try again." } : { generation: 0, revision: 0 }),
      { status: options?.method === "PUT" ? 409 : 200 })));
  render(<WithdrawLoanAction loan={loan} />);
  const dialog = await openDialog();
  fireEvent.click(dialog.getByRole("checkbox"));
  fireEvent.click(dialog.getByRole("button", { name: "Withdraw Loan" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Loan changed");
  expect(toast).not.toHaveBeenCalled();
  expect(dialog.getByRole("button", { name: "Withdraw Loan" })).toBeEnabled();
});
it("rejects unacknowledged withdrawal data", () => {
  expect(sectionSchemas.withdrawal.safeParse({ acknowledged: false }).success).toBe(false);
  expect(sectionSchemas.withdrawal.safeParse({ acknowledged: true }).success).toBe(true);
});
