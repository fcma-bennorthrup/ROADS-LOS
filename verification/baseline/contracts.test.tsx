import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { RoadsDatePicker } from "@/components/loan/RoadsDatePicker";
import { useGitHubSync } from "@/hooks/use-github-sync";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("blocks unmocked transports", () => {
  expect(() => fetch("https://invalid.example")).toThrow("VALIDATION_EXTERNAL_TRANSPORT_BLOCKED");
  expect(() => new XMLHttpRequest().open("GET", "https://invalid.example")).toThrow("VALIDATION_EXTERNAL_TRANSPORT_BLOCKED");
  expect(() => window.open("https://invalid.example")).toThrow("VALIDATION_EXTERNAL_TRANSPORT_BLOCKED");
});

it("renders the existing shared calendar with the accepted library", () => {
  render(<Calendar mode="single" defaultMonth={new Date(2026, 9, 1)} />);
  expect(screen.getByText("October 2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /next month/i }));
  expect(screen.getByText("November 2026")).toBeInTheDocument();
});

it("retains picker weekends, selection formatting, close and trigger focus", () => {
  const change = vi.fn();
  render(<RoadsDatePicker value="10/14/2026" onChange={change} testId="date" />);
  const trigger = screen.getByRole("button", { name: "Open calendar" });
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog", { name: "Date picker" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Saturday, October 17th/i })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /Thursday, October 15th/i }));
  expect(change).toHaveBeenCalledExactlyOnceWith("10/15/2026");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("normal pull without arguments sends no body; force pull sends its explicit payload", async () => {
  const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    commitSha: "synthetic", message: "Synthetic pull complete",
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  // Each call needs a fresh response body.
  transport.mockImplementation(async () => new Response(JSON.stringify({
    commitSha: "synthetic", message: "Synthetic pull complete",
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", transport);
  const client = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => useGitHubSync(), { wrapper });
  // Intentionally exercise the same no-argument call as the existing panel;
  // this is runtime evidence, not a suppression of the separate tsc diagnostic.
  await act(async () => { await result.current.pullMutation.mutateAsync(); });
  expect(transport).toHaveBeenNthCalledWith(1, "/api/github/pull", { method: "POST", credentials: "include" });
  await act(async () => { await result.current.pullMutation.mutateAsync({ force: true }); });
  expect(transport).toHaveBeenNthCalledWith(2, "/api/github/pull", {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: '{"force":true}',
  });
  expect(transport).toHaveBeenCalledTimes(2);
  unmount();
  client.clear();
});
