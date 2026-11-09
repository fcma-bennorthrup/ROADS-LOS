import { queryClient } from "./queryClient";
import type { DatabaseCompatibilityReport } from "@shared/database-compatibility";

export const DATABASE_COMPATIBILITY_KEY = ["/api/database/compatibility"] as const;
export async function readDatabaseCompatibility(): Promise<DatabaseCompatibilityReport> {
  const response = await fetch(DATABASE_COMPATIBILITY_KEY[0], { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Database check unavailable.");
  const result = await response.json();
  if (!["compatible", "needs-upgrade", "blocked", "unavailable"].includes(result.status))
    throw new Error("Database check unavailable.");
  return result;
}
/** A database warning must never turn a successful code pull into 'Pull Failed'. */
export async function checkDatabaseAfterPull(notify: (message: { title: string; description: string; variant?: "destructive" }) => unknown,
  automaticResult?: DatabaseCompatibilityReport) {
  try {
    // Consume the server's post-upgrade result. GET remains strictly read-only
    // and is only the compatibility fallback for older running server versions.
    const report = automaticResult ?? await readDatabaseCompatibility();
    queryClient.setQueryData(DATABASE_COMPATIBILITY_KEY, report);
    if (report.status !== "compatible") notify({
      title: "Code pulled — database needs attention",
      description: report.message, variant: "destructive",
    });
  } catch {
    notify({ title: "Code pulled — database check unavailable",
      description: "The code pull succeeded, but database status is unconfirmed. Run npm run db:check before retrying.", variant: "destructive" });
  }
}
