import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LoanIdProvider } from "./loan-id-context";
import { LoanApplicationProvider, useApplicationStatus } from "./loan-application-context";
import { applicationStore } from "@/lib/loan-application-store";
import { newLoanApplication } from "@shared/loan-factory";
import { queryClient } from "@/lib/queryClient";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); queryClient.clear(); });
function ActiveLoan() {
  return <span data-testid="active-loan">{useApplicationStatus().document?.loan.id}</span>;
}
const scope = (id: string) => <LoanIdProvider key={id} id={id}><LoanApplicationProvider><ActiveLoan /></LoanApplicationProvider></LoanIdProvider>;
it("does not let a slow old poll install over the next loan, even after returning to the same id", async () => {
  vi.useFakeTimers();
  const first = newLoanApplication({ id: "first", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
  const second = newLoanApplication({ id: "second", loanNumber: "123456791", source: "blank", borrowerCount: 2 });
  let firstCalls = 0;
  let finish!: (response: Response) => void;
  const slow = new Promise<Response>(resolve => { finish = resolve; });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("/first/")) {
      firstCalls++;
      if (firstCalls === 2) return slow;
      return new Response(JSON.stringify(first));
    }
    return new Response(JSON.stringify(second));
  }));
  const view = render(scope("first"));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByTestId("active-loan")).toHaveTextContent("first");
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  view.rerender(scope("second"));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByTestId("active-loan")).toHaveTextContent("second");
  view.rerender(scope("first"));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  const stale = structuredClone(first); stale.revision = 100; stale.loan.primaryBorrowerName = "Stale";
  await act(async () => { finish(new Response(JSON.stringify(stale))); await vi.advanceTimersByTimeAsync(0); });
  expect(applicationStore.document?.loan.id).toBe("first");
  expect(applicationStore.document?.revision).toBe(0);
});
it("does not install an initial load that finishes after its scope unmounts", async () => {
  const first = newLoanApplication({ id: "late", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
  const second = newLoanApplication({ id: "active", loanNumber: "123456791", source: "blank", borrowerCount: 2 });
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
  const view = render(scope("late"));
  await act(async () => { await Promise.resolve(); });
  view.unmount();
  applicationStore.install(second);
  await act(async () => { finish(new Response(JSON.stringify(first))); });
  expect(applicationStore.document?.loan.id).toBe("active");
});
