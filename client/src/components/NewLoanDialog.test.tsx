import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, expect, it, vi } from "vitest";
import { NewLoanDialog } from "./NewLoanDialog";
import { queryClient } from "@/lib/queryClient";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); queryClient.clear(); });
it("creates a two-borrower SF loan without any Blend call or navigation", async () => {
  const { hook, history } = memoryLocation({ path: "/pipeline", record: true });
  const requests: string[] = [];
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    requests.push(url);
    const body = JSON.parse(String(options.body));
    expect(body).toEqual({ source: "sf", borrowerCount: 2, idempotencyKey: expect.any(String) });
    return new Response(JSON.stringify({ id: "two", loanNumber: "123456790" }), { status: 201 });
  });
  vi.stubGlobal("fetch", fetchMock);
  const busy = vi.fn();
  const created = vi.fn();
  render(<Router hook={hook}><NewLoanDialog open onOpenChange={() => {}} onBusyChange={busy} onSfCreated={created} /></Router>);
  expect(screen.getByTestId("new-loan-borrowers-1")).toBeChecked();
  expect(screen.queryByText("Application source")).toBeNull();
  expect(screen.queryByTestId("source-blend")).toBeNull();
  fireEvent.click(screen.getByTestId("new-loan-borrowers-2"));
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  await waitFor(() => expect(created).toHaveBeenCalledWith({ id: "two", loanNumber: "123456790" }));
  expect(history).toEqual(["/pipeline"]);
  expect(requests).toEqual(["/api/loans"]);
  expect(screen.getByTestId("new-loan-borrowers-1")).toBeChecked();
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
    source: "sf", borrowerCount: 1, idempotencyKey: expect.any(String),
  });
});
it("reuses the attempt after a lost response and locks the borrower count", async () => {
  const { hook, history } = memoryLocation({ path: "/pipeline", record: true });
  const bodies: any[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    bodies.push(JSON.parse(String(options.body)));
    if (bodies.length === 1) throw new TypeError("Response lost");
    return new Response(JSON.stringify({ id: "original", loanNumber: "123456790" }), { status: 201 });
  }));
  render(<Router hook={hook}><NewLoanDialog open onOpenChange={() => {}} onBusyChange={() => {}} /></Router>);
  fireEvent.click(screen.getByTestId("new-loan-borrowers-2"));
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Response lost");
  expect(screen.getByTestId("new-loan-borrowers-1")).toBeDisabled();
  expect(screen.getByTestId("new-loan-borrowers-2")).toBeDisabled();
  fireEvent.click(screen.getByTestId("confirm-new-loan"));
  await waitFor(() => expect(screen.getByTestId("new-loan-borrowers-1")).toBeEnabled());
  expect(history).toEqual(["/pipeline"]);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(bodies[0].borrowerCount).toBe(2);
  expect(bodies[0].idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
});
