import { afterEach, expect, it, vi } from "vitest";
const execFile = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFile, default: { execFile } }));
import { checkDatabaseCompatibility, upgradeDatabaseAfterPull } from "../database-compatibility";
afterEach(() => { vi.unstubAllEnvs(); execFile.mockReset(); });
it.each(["production", "test"])("never spawns automatic writes in %s", async mode => {
  vi.stubEnv("NODE_ENV", mode);
  expect((await upgradeDatabaseAfterPull()).status).toBe("blocked");
  expect(execFile).not.toHaveBeenCalled();
});
it("also refuses a deployment even with development NODE_ENV", async () => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("REPLIT_DEPLOYMENT", "1");
  expect((await upgradeDatabaseAfterPull()).status).toBe("blocked");
  expect(execFile).not.toHaveBeenCalled();
});
it("uses a fresh approved auto command in development without overriding its environment", async () => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("REPLIT_DEPLOYMENT", "");
  execFile.mockImplementation((_exe, args, options, callback) => {
    expect(args).toEqual(["--import", "tsx", "script/database.ts", "auto", "--json", "--development"]);
    expect(options.env).toBeUndefined();
    callback(null, JSON.stringify({ status: "compatible", message: "Verified", pending: [], issues: [], documentVersion: 1, checkedLoans: 4 }));
  });
  expect((await upgradeDatabaseAfterPull()).status).toBe("compatible");
});
it("a timeout is unconfirmed, not a claim that nothing changed", async () => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("REPLIT_DEPLOYMENT", "");
  execFile.mockImplementation((_exe, _args, _options, callback) => callback(new Error("timeout"), ""));
  const result = await upgradeDatabaseAfterPull();
  expect(result.status).toBe("unavailable");
  expect(result.message).toContain("before retrying");
});
it("the GET compatibility command stays read-only", async () => {
  execFile.mockImplementation((_exe, args, _options, callback) => {
    expect(args).toEqual(["--import", "tsx", "script/database.ts", "check", "--json"]);
    callback(null, JSON.stringify({ status: "compatible", message: "Verified", pending: [], issues: [], documentVersion: 1, checkedLoans: 4 }));
  });
  expect((await checkDatabaseCompatibility()).status).toBe("compatible");
});
