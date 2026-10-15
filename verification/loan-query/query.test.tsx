import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, focusManager, useQuery } from "@tanstack/react-query";
import { useLoanQuery } from "../../client/src/hooks/use-loan-query";
import { queryClient } from "../../client/src/lib/queryClient";
import type { LoanWithBorrowers } from "../../client/src/lib/loan-display";
import { loan } from "../summary/fixtures";

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(c => c.clear());
  focusManager.setFocused(undefined);
  vi.useRealTimers();
});
const original = (id: string) => useQuery<LoanWithBorrowers>({ queryKey: ["/api/loans", id] });
for (const [name, hook] of [["baseline", original], ["candidate", useLoanQuery]] as const) {
  function mount(cached?: unknown) {
    const client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
    clients.push(client);
    if (cached !== undefined) client.setQueryData(["/api/loans", "a"], cached);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, ...renderHook(({ id }) => {
      const result = hook(id);
      // Match the pages' render-time subscriptions, not just test-time reads.
      const { data, isLoading, error } = result;
      return { ...result, data, isLoading, error };
    }, { initialProps: { id: "a" }, wrapper }) };
  }
  function transport(body: string, status = 200) {
    const fetch = vi.fn(async () => new Response(body, { status }));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }
  it(`${name}: deferred request, exact options, ID change and cache reuse`, async () => {
    let resolve!: (r: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>(r => { resolve = r; }));
    vi.stubGlobal("fetch", fetch);
    const h = mount();
    expect(h.result.current.isLoading).toBe(true);
    expect(fetch.mock.calls).toEqual([["/api/loans/a", { credentials: "include" }]]);
    const q = h.client.getQueryCache().find({ queryKey: ["/api/loans", "a"] })!;
    expect(q.queryKey).toEqual(["/api/loans", "a"]);
    expect(q.getObserversCount()).toBe(1);
    expect(q.options).toMatchObject({ staleTime: Infinity, retry: false,
      refetchInterval: false, refetchOnWindowFocus: false });
    await act(async () => resolve(new Response(JSON.stringify(loan))));
    await waitFor(() => expect(h.result.current.data).toEqual(loan));
    act(() => { focusManager.setFocused(false); focusManager.setFocused(true); });
    expect(fetch).toHaveBeenCalledTimes(1);
    h.rerender({ id: "b" });
    expect(h.result.current.isLoading).toBe(true);
    expect(fetch.mock.calls[1]).toEqual(["/api/loans/b", { credentials: "include" }]);
    await act(async () => resolve(new Response(JSON.stringify({ ...loan, id: "b" }))));
    await waitFor(() => expect(h.result.current.data?.id).toBe("b"));
    h.rerender({ id: "a" });
    expect(h.result.current.data).toEqual(loan);
    expect(fetch).toHaveBeenCalledTimes(2);
    h.unmount();
    expect(q.getObserversCount()).toBe(0);
    const again = renderHook(() => hook("a"), { wrapper: ({ children }) =>
      <QueryClientProvider client={h.client}>{children}</QueryClientProvider> });
    expect(again.result.current.data).toEqual(loan);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  for (const body of ["null", "false", "0", '""']) {
    it(`${name}: preserves falsy ${body}`, async () => {
      const fetch = transport(body);
      const h = mount();
      await waitFor(() => expect(h.result.current.isSuccess).toBe(true));
      expect(h.result.current.data).toBe(JSON.parse(body));
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  }
  for (const [body, status] of [["missing", 404], ["failed", 500], ["<html>fixture</html>", 200]] as const) {
    it(`${name}: preserves ${status} ${body} without retries`, async () => {
      const fetch = transport(body, status);
      const h = mount();
      await waitFor(() => expect(h.result.current.isError).toBe(true));
      if (status !== 200) expect(h.result.current.error?.message).toBe(`${status}: ${body}`);
      else expect(h.result.current.error).toBeInstanceOf(SyntaxError);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(h.result.current.data).toBeUndefined();
    });
  }
  it(`${name}: cached data plus error remains an error with retained data`, async () => {
    const fetch = transport("failed", 500);
    const h = mount(loan);
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => { await h.result.current.refetch(); });
    await waitFor(() => expect(h.result.current.error?.message).toBe("500: failed"));
    expect(h.result.current.data).toEqual(loan);
    expect(h.result.current.isLoading).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
}
