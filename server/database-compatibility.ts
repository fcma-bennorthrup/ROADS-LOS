import { execFile } from "node:child_process";
import type { Express } from "express";
import { z } from "zod";
import type { DatabaseCompatibilityReport } from "../shared/database-compatibility";

const reportSchema = z.object({
  status: z.enum(["compatible", "needs-upgrade", "blocked", "unavailable"]),
  message: z.string(), pending: z.array(z.string()), issues: z.array(z.string()),
  documentVersion: z.number(), checkedLoans: z.number(),
});
let inFlight: Promise<DatabaseCompatibilityReport> | undefined;

/** Fresh process reads the newly pulled contract, not the old server module cache.
 * The check command uses a read-only transaction. There is no HTTP apply endpoint. */
export function checkDatabaseCompatibility(): Promise<DatabaseCompatibilityReport> {
  if (inFlight) return inFlight;
  inFlight = new Promise<DatabaseCompatibilityReport>(resolve => {
    execFile(process.execPath, ["--import", "tsx", "script/database.ts", "check", "--json"],
      { cwd: process.cwd(), timeout: 20000, maxBuffer: 128 * 1024 }, (_error, stdout) => {
        try { resolve(reportSchema.parse(JSON.parse(stdout))); }
        catch {
          resolve({ status: "unavailable", message: "The database check could not run. Run npm run db:check in the project Shell after installing the pulled dependencies.",
            pending: [], issues: [], documentVersion: 1, checkedLoans: 0 });
        }
      });
  }).finally(() => { inFlight = undefined; });
  return inFlight;
}

export function registerDatabaseCompatibilityRoutes(app: Express) {
  app.get("/api/database/compatibility", async (_req, res) => {
    res.set("Cache-Control", "no-store").json(await checkDatabaseCompatibility());
  });
}
