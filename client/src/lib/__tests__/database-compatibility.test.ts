import { afterEach, expect, it, vi } from "vitest";
import { checkDatabaseAfterPull } from "../database-compatibility";
afterEach(() => vi.unstubAllGlobals());
it("separates a successful pull from pending database setup", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    status: "needs-upgrade", message: "Run npm run db:upgrade:dev", pending: ["001"],
  }))));
  const notify = vi.fn();
  await checkDatabaseAfterPull(notify);
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Code pulled — database needs attention" }));
});
it("reports failed checks without rejecting the successful pull", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
  const notify = vi.fn();
  await expect(checkDatabaseAfterPull(notify)).resolves.toBeUndefined();
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Code pulled — database check unavailable" }));
});
it("does not warn when compatible and never makes a mutation request", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ status: "compatible", message: "Matches" })));
  vi.stubGlobal("fetch", fetcher);
  const notify = vi.fn();
  await checkDatabaseAfterPull(notify);
  expect(notify).not.toHaveBeenCalled();
  expect(fetcher.mock.calls[0][0]).toBe("/api/database/compatibility");
});
