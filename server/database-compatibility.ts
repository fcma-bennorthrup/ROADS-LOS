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
function runDatabaseCommand(action: "check" | "auto"): Promise<DatabaseCompatibilityReport> {
  return new Promise<DatabaseCompatibilityReport>(resolve => {
    execFile(process.execPath, ["--import", "tsx", "script/database.ts", action, "--json",
      ...(action === "auto" ? ["--development"] : [])],
      { cwd: process.cwd(), timeout: 20000, maxBuffer: 128 * 1024 }, (_error, stdout) => {
        try {
          // Nonzero exit 2 is a valid incompatible/blocked report, not success.
          const report = reportSchema.parse(JSON.parse(stdout));
          if (_error && report.status === "compatible") throw new Error("Unconfirmed completion");
          resolve(report);
        }
        catch {
          resolve({ status: "unavailable", message: "Database completion could not be confirmed. Run npm run db:check before retrying; install pulled dependencies if needed.",
            pending: [], issues: [], documentVersion: 1, checkedLoans: 0 });
        }
      });
  });
}
export function checkDatabaseCompatibility(): Promise<DatabaseCompatibilityReport> {
  if (inFlight) return inFlight;
  inFlight = runDatabaseCommand("check").finally(() => { inFlight = undefined; });
  return inFlight;
}

/** Called only after successful pull recovery has committed, under the sync lock.
 * Do not override NODE_ENV: a deployed server must never spawn a write command. */
export async function upgradeDatabaseAfterPull(): Promise<DatabaseCompatibilityReport> {
  if (process.env.NODE_ENV !== "development" ||
      ["1", "true"].includes(process.env.REPLIT_DEPLOYMENT ?? ""))
    return { status: "blocked", message: "Automatic database upgrades are development-only and were skipped in this environment.",
      pending: [], issues: [], documentVersion: 1, checkedLoans: 0 };
  return runDatabaseCommand("auto");
}

export function registerDatabaseCompatibilityRoutes(app: Express) {
  app.get("/api/database/compatibility", async (_req, res) => {
    res.set("Cache-Control", "no-store").json(await checkDatabaseCompatibility());
  });
}
