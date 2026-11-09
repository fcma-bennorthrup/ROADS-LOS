import pg from "pg";
import { applyDevelopmentUpgrades, inspectDatabase, readUpgrades } from "./db-compatibility";

const action = process.argv[2];
const json = process.argv.includes("--json");
let pool: pg.Pool | undefined;
try {
  if (!["check", "apply"].includes(action)) throw new Error("Use check or apply.");
  if (!process.env.DATABASE_URL) throw new Error("A development database connection is required.");
  const upgrades = await readUpgrades();
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000,
    statement_timeout: 15000 });
  const client = await pool.connect();
  try {
    let report;
    if (action === "apply") report = await applyDevelopmentUpgrades(client, upgrades, process.env, process.argv.includes("--development"));
    else {
      await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      try { report = await inspectDatabase(client, upgrades); }
      finally { await client.query("ROLLBACK"); }
    }
    console.log(json ? JSON.stringify(report) : [report.message, ...report.issues,
      ...(report.pending.length ? [`Pending: ${report.pending.join(", ")}`] : [])].join("\n"));
    if (report.status !== "compatible") process.exitCode = 2;
  } finally { client.release(); }
} catch {
  // Driver errors can include connection details or bad row contents. Do not log them.
  const report = { status: "unavailable", message: "Database check or upgrade could not complete. Verify the project database connection, repository upgrade files, and development-only command. No upgrade success was confirmed.",
    pending: [], issues: [], documentVersion: 1, checkedLoans: 0 };
  console.log(json ? JSON.stringify(report) : report.message);
  process.exitCode = 1;
} finally { await pool?.end(); }
