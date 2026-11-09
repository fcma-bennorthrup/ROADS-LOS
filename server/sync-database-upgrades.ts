import type { RequestHandler } from "express";
import type { DatabaseCompatibilityReport } from "../shared/database-compatibility";

/** Wrap recovery, but stay INSIDE the sync coordinator. Recovery commits the
 * code checkpoint before we run, and another pull cannot replace the scripts
 * while the fresh upgrade process is reading them. No database failure may
 * relabel the committed code pull as a failed file operation. */
export function withDatabaseAfterPull(handler: RequestHandler, operation: "pull" | "resolve-conflicts",
  upgrade?: () => Promise<DatabaseCompatibilityReport>,
  hasPendingConflicts: () => boolean = () => false): RequestHandler {
  if (!upgrade) return handler; // Explicitly omitted in filesystem-only test adapters.
  return async (req, res, next) => {
    const json = res.json.bind(res);
    let body: any;
    res.json = ((value: unknown) => { body = value; return res; }) as typeof res.json;
    try {
      await handler(req, res, next);
      if (res.statusCode >= 200 && res.statusCode < 300 && body && !body.error &&
          !body.hasConflicts && !body.conflicts?.length &&
          (operation === "pull" || body.operation === "pull")) {
        let database: DatabaseCompatibilityReport;
        try {
          database = hasPendingConflicts()
            ? { status: "blocked", message: "Resolve pending GitHub conflicts before automatic database upgrades.",
              pending: [], issues: [], checkedLoans: 0, documentVersion: 1 }
            : await upgrade();
        }
        catch {
          database = { status: "unavailable", message: "Code pull succeeded, but database completion was not confirmed. Run npm run db:check before retrying.",
            pending: [], issues: [], checkedLoans: 0, documentVersion: 1 };
        }
        body = { ...body, database, message: `${body.message}\n${database.message}` };
      }
    } finally { res.json = json; }
    if (body !== undefined) json(body);
  };
}
