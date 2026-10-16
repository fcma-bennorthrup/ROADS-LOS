import { describe, expect, it } from "vitest";
import { readGitHubSyncResponse } from "../github-response";

function response(status: number, body: string): Response {
  return { status, text: async () => body } as Response;
}

describe("GitHub sync responses", () => {
  it("preserves successful JSON", async () => {
    await expect(readGitHubSyncResponse(response(200, '{"message":"Done"}')))
      .resolves.toEqual({ message: "Done" });
  });
  it("preserves conflicts and API errors for the caller", async () => {
    await expect(readGitHubSyncResponse(response(409, '{"hasConflicts":true}')))
      .resolves.toEqual({ hasConflicts: true });
    await expect(readGitHubSyncResponse(response(500, '{"error":"Access denied"}')))
      .resolves.toEqual({ error: "Access denied" });
  });
  it("reports HTML gateway responses without exposing HTML", async () => {
    await expect(readGitHubSyncResponse(response(502, "<!DOCTYPE html><html>Error</html>")))
      .rejects.toThrow("non-JSON response (HTTP 502)");
  });
  it("rejects HTML even with status 200, empty bodies, and invalid JSON shapes", async () => {
    for (const body of ["<html>Login</html>", "", "null", "[]"]) {
      await expect(readGitHubSyncResponse(response(200, body))).rejects.toThrow();
    }
  });
});
