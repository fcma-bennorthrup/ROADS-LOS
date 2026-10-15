import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { queryClient } from "../../client/src/lib/queryClient";
import LoanSummaryPage from "../../client/src/pages/loan-summary";
import { loan } from "./fixtures";

vi.mock("@/components/loan/LoanHeader", () => ({
  LoanHeader: () => <header data-testid="fixture-header" />,
  BottomToolbar: () => <footer />,
}));
vi.mock("@/components/loan/LoanActivityPanel", () => ({ LoanActivityPanel: () => null }));

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup(); clients.forEach(c => c.clear()); clients.length = 0;
  vi.unstubAllGlobals(); vi.useRealTimers();
});
function mount() {
  // Reuse production query defaults; do not replace retries/cache policy in tests.
  const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
  clients.push(client);
  const location = memoryLocation({ path: "/loans/synthetic" });
  const view = render(<QueryClientProvider client={client}><Router hook={location.hook}>
    <Route path="/loans/:id"><LoanSummaryPage /></Route>
  </Router></QueryClientProvider>);
  return { client, ...view };
}

it("uses the real deferred request and caches the exact loan key with existing policies", async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn(() => new Promise<Response>(r => { resolve = r; }));
  vi.stubGlobal("fetch", fetch);
  const { client } = mount();
  expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading loan details...");
  expect(screen.queryByTestId("fixture-header")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/loans/synthetic", { credentials: "include" });
  resolve(new Response(JSON.stringify(loan)));
  await screen.findByTestId("loan-summary-page");
  expect(client.getQueryData(["/api/loans", "synthetic"])).toEqual(loan);
  expect(client.getDefaultOptions().queries).toMatchObject({
    staleTime: Infinity, retry: false, refetchOnWindowFocus: false, refetchInterval: false,
  });
  window.dispatchEvent(new Event("focus"));
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each([
  ["404", () => Promise.resolve(new Response("missing", { status: 404 }))],
  ["500", () => Promise.resolve(new Response("failure", { status: 500 }))],
  ["HTML", () => Promise.resolve(new Response("<html>failure</html>"))],
  ["network", () => Promise.reject(new Error("synthetic network failure"))],
  ["null", () => Promise.resolve(new Response("null"))],
])("preserves generic error for %s without retry or header", async (_, response) => {
  const fetch = vi.fn(response);
  vi.stubGlobal("fetch", fetch);
  const { client } = mount();
  await screen.findByTestId("error-state");
  expect(screen.getByTestId("error-state").textContent).toBe("Failed to load loan data");
  expect(screen.queryByTestId("fixture-header")).not.toBeInTheDocument();
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(fetch).toHaveBeenCalledTimes(1);
});
