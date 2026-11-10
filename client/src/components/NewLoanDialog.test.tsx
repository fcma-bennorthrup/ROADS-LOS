import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, expect, it, vi } from "vitest";
import { NewLoanDialog } from "./NewLoanDialog";
import { queryClient } from "@/lib/queryClient";
import { applicationStore } from "@/lib/loan-application-store";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); queryClient.clear(); });
it("retains a failed Blend blank and retries the import without another creation", async () => {
  const { hook, history } = memoryLocation({ path: "/pipeline", record: true });
  let fail = true;
  const requests: string[] = [];
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    requests.push(url);
    const body = JSON.parse(String(options.body));
    if (url === "/api/loans") {
      expect(body).toEqual({ source: "blank", idempotencyKey: expect.any(String) });
      return new Response(JSON.stringify({ id: "retained", loanNumber: "123456790" }), { status: 201 });
    }
    expect(body).toMatchObject({ action: "blend", borrowerCount: 1, generation: 0, revision: 0, confirmed: true });
    expect(body.sections["current-liabilities"]).toEqual([]);
    expect(body.sections["noncurrent-liabilities"]).toEqual([]);
    expect(body.sections["subject-property"].collateralOwnerId).toBe("retained-primary");
    if (fail) return new Response(JSON.stringify({ error: "Import unavailable" }), { status: 503 });
    return new Response("{}");
  });
  vi.stubGlobal("fetch", fetchMock);
  const install = vi.spyOn(applicationStore, "install");
  const busy = vi.fn();
  render(<Router hook={hook}><NewLoanDialog open onOpenChange={() => {}} onBusyChange={busy} /></Router>);
  fireEvent.click(screen.getByTestId("source-blend"));
  fireEvent.click(screen.getByTestId("new-loan-borrowers-1"));
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent("Loan 123456790 was retained");
  expect(screen.getByRole("alert")).toHaveTextContent("Import unavailable");
  expect(history).toEqual(["/pipeline"]);
  fail = false;
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  await waitFor(() => expect(history.at(-1)).toBe("/loans/retained"));
  expect(requests.filter(url => url === "/api/loans")).toHaveLength(1);
  expect(requests.filter(url => url.endsWith("/demo"))).toHaveLength(2);
  expect(install).not.toHaveBeenCalled();
  expect(busy).toHaveBeenLastCalledWith(false);
});
it("creates an SF opportunity and stays on Pipeline ready for another creation", async () => {
  const { hook, history } = memoryLocation({ path: "/pipeline", record: true });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "blank", loanNumber: "123456791" }), { status: 201 })));
  const created = vi.fn();
  render(<Router hook={hook}><NewLoanDialog open onOpenChange={() => {}} onBusyChange={() => {}} onSfCreated={created} /></Router>);
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  await waitFor(() => expect(created).toHaveBeenCalledWith({ id: "blank", loanNumber: "123456791" }));
  expect(history).toEqual(["/pipeline"]);
  expect(fetch).toHaveBeenCalledTimes(1);
  const firstKey = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).idempotencyKey;
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  await waitFor(() => expect(created).toHaveBeenCalledTimes(2));
  expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string).idempotencyKey).not.toBe(firstKey);
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({
    source: "sf", idempotencyKey: expect.any(String),
  });
});
it("reuses the attempt after a lost response and locks the original source", async () => {
  const { hook, history } = memoryLocation({ path: "/pipeline", record: true });
  const bodies: any[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    bodies.push(JSON.parse(String(options.body)));
    if (bodies.length === 1) throw new TypeError("Response lost");
    return new Response(JSON.stringify({ id: "original", loanNumber: "123456790" }), { status: 201 });
  }));
  render(<Router hook={hook}><NewLoanDialog open onOpenChange={() => {}} onBusyChange={() => {}} /></Router>);
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Response lost");
  expect(screen.getByTestId("source-blend")).toBeDisabled();
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  await waitFor(() => expect(screen.getByTestId("source-sf")).toBeEnabled());
  expect(history).toEqual(["/pipeline"]);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(bodies[0].idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
});
