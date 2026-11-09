import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { assertLoanDocument, LOAN_DOCUMENT_VERSION } from "../shared/loan-contract";
import type { DatabaseCompatibilityReport } from "../shared/database-compatibility";
import { getTableConfig } from "drizzle-orm/pg-core";
import { prototypeLoanApplications } from "../shared/schema";

export type DatabaseReport = DatabaseCompatibilityReport;
type Query = Pick<PoolClient, "query">;
export type Upgrade = { id: string; file: string; kind: "sql" | "loan-document-version"; content: string; checksum: string };
const manifestSchema = z.object({
  format: z.literal(1),
  upgrades: z.array(z.object({
    id: z.string().regex(/^\d{3}-[a-z0-9-]+$/),
    file: z.string().regex(/^[a-z0-9-]+\.(sql|json)$/),
    kind: z.enum(["sql", "loan-document-version"]),
  })),
});
export async function readUpgrades(root = process.cwd()): Promise<Upgrade[]> {
  const dir = path.join(root, "script/db-upgrades");
  const manifest = manifestSchema.parse(JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")));
  const ids = manifest.upgrades.map(row => row.id);
  if (new Set(ids).size !== ids.length || ids.join() !== [...ids].sort().join()) throw new Error("Upgrade IDs must be unique and ordered.");
  return Promise.all(manifest.upgrades.map(async item => {
    const content = await readFile(path.join(dir, item.file), "utf8");
    return { ...item, content, checksum: createHash("sha256").update(`${item.kind}\n${content}`).digest("hex") };
  }));
}

export async function inspectDatabase(db: Query, upgrades: Upgrade[]): Promise<DatabaseReport> {
  const issues: string[] = [];
  const tables = await db.query(`SELECT to_regclass('public.prototype_loan_applications') AS loans,
    to_regclass('public.roads_development_upgrades') AS ledger`);
  const { loans, ledger } = tables.rows[0];
  const applied: { id: string; checksum: string }[] = ledger
    ? (await db.query("SELECT id, checksum FROM public.roads_development_upgrades ORDER BY id")).rows : [];
  for (const row of applied) {
    const expected = upgrades.find(item => item.id === row.id);
    if (!expected) issues.push(`Database has unknown upgrade ${row.id}; pull the matching code before proceeding.`);
    else if (row.checksum !== expected.checksum) issues.push(`Upgrade ${row.id} was edited after being applied. Resolve the shared file conflict; do not rewrite the ledger.`);
  }
  const pending = upgrades.filter(row => !applied.some(old => old.id === row.id)).map(row => row.id);
  // A ledger must be an uninterrupted prefix: applying a later step alone is drift.
  const appliedIds = applied.map(row => row.id);
  if (appliedIds.some((id, index) => upgrades[index]?.id !== id))
    issues.push("Applied upgrades are not an ordered prefix of the repository manifest.");
  let checkedLoans = 0;
  let oldDocuments = 0;
  if (loans) {
    const columns = (await db.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name='prototype_loan_applications' ORDER BY ordinal_position`)).rows;
    const modelColumns = getTableConfig(prototypeLoanApplications).columns;
    if (columns.length !== modelColumns.length || columns.some(row => {
      const wanted = modelColumns.find(column => column.name === row.column_name);
      return !wanted || wanted.getSQLType() !== row.data_type || (wanted.notNull ? "NO" : "YES") !== row.is_nullable;
    })) issues.push("Loan table columns differ from the shared contract; review types, nullability, or extra columns. No automatic repair is allowed.");
    const key = (await db.query(`SELECT a.attname FROM pg_index i
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
      WHERE i.indrelid='public.prototype_loan_applications'::regclass AND i.indisprimary`)).rows;
    const primary = modelColumns.filter(column => column.primary).map(column => column.name).sort();
    if (JSON.stringify(key.map(row => row.attname).sort()) !== JSON.stringify(primary))
      issues.push("Loan table primary key differs from the shared contract.");
    if (!issues.some(issue => issue.startsWith("Loan table"))) {
      const rows = await db.query("SELECT loan_id, document FROM public.prototype_loan_applications");
      for (const row of rows.rows) {
        checkedLoans++;
        try {
          assertLoanDocument(row.document, row.loan_id);
          if ((row.document.schemaVersion ?? 0) < LOAN_DOCUMENT_VERSION) oldDocuments++;
        } catch { issues.push(`Stored loan document ${checkedLoans} does not match the shared contract. Review it locally; no data was printed or repaired.`); }
      }
    }
  } else if (applied.length) issues.push("The upgrade ledger exists but the loan table is missing.");
  if (oldDocuments && !pending.some(id => upgrades.find(row => row.id === id)?.kind === "loan-document-version"))
    issues.push("Older document versions exist although their upgrade is already recorded. Review data drift before continuing.");
  const status = issues.length ? "blocked" : pending.length || !loans ? "needs-upgrade" : "compatible";
  return {
    status, pending, issues, checkedLoans, documentVersion: LOAN_DOCUMENT_VERSION,
    message: status === "compatible" ? "Database and loan documents match this code version."
      : status === "blocked" ? "Database differences need review. No automatic changes were made."
      : "Development database setup is pending. Run npm run db:upgrade:dev, then npm run db:check.",
  };
}

export function assertDevelopmentUpgrade(env: NodeJS.ProcessEnv, confirmed: boolean) {
  if (!confirmed || env.NODE_ENV !== "development" || env.REPLIT_DEPLOYMENT === "1" || env.REPLIT_DEPLOYMENT === "true")
    throw new Error("Upgrades are development-only. Use the explicit db:upgrade:dev command in the Project Editor, never Publish or production.");
}

export async function readAutomaticApprovals(root = process.cwd()): Promise<Record<string, string>> {
  return z.record(z.string().regex(/^[a-f0-9]{64}$/)).parse(JSON.parse(
    await readFile(path.join(root, "script/db-upgrades/automatic-approvals.json"), "utf8")));
}

/** Only exact, reviewed upgrade bytes can run automatically. The ledger and
 * schema checks still run inside the transaction immediately before applying. */
export async function automaticallyUpgradeDevelopment(db: Query, upgrades: Upgrade[],
  approvals: Record<string, string>, env: NodeJS.ProcessEnv) {
  assertDevelopmentUpgrade(env, true);
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  let before: DatabaseReport;
  try { before = await inspectDatabase(db, upgrades); }
  finally { await db.query("ROLLBACK"); }
  if (before.status !== "needs-upgrade") return before;
  const unapproved = upgrades.filter(row => before.pending.includes(row.id) && approvals[row.id] !== row.checksum);
  if (unapproved.length) return {
    ...before, status: "blocked" as const,
    message: "Code pulled, but pending database upgrades need approval. Review them before applying.",
    issues: [...before.issues, ...unapproved.map(row => `Automatic approval missing or changed: ${row.id}.`)],
  };
  const result = await applyDevelopmentUpgrades(db, upgrades, env, true, approvals);
  return { ...result, message: "Development database upgrades applied and compatibility verified." };
}

export function upgradeLoanDocument(value: unknown, upgrade: Upgrade) {
  const spec = z.object({
    kind: z.literal("loan-document-version"), fromVersion: z.literal(0), toVersion: z.literal(1),
    description: z.string(),
  }).strict().parse(JSON.parse(upgrade.content));
  assertLoanDocument(value);
  const version = value.schemaVersion ?? 0;
  if (version === spec.toVersion) return value;
  if (version !== spec.fromVersion) throw new Error("Unsupported loan document version.");
  const next = { ...value, schemaVersion: spec.toVersion,
    // Revision zero is the existing browser-data adoption marker.
    revision: value.revision === 0 ? 0 : value.revision + 1 };
  assertLoanDocument(next);
  return next;
}

/** Caller supplies a dedicated connection. No application-startup or production call path. */
export async function applyDevelopmentUpgrades(db: Query, upgrades: Upgrade[], env: NodeJS.ProcessEnv, confirmed: boolean,
  automaticApprovals?: Record<string, string>) {
  assertDevelopmentUpgrade(env, confirmed);
  await db.query("BEGIN");
  try {
    await db.query("SET LOCAL lock_timeout = '5s'");
    await db.query("SELECT pg_advisory_xact_lock(784220)");
    const before = await inspectDatabase(db, upgrades);
    if (before.status === "blocked") throw new Error(before.message + " " + before.issues.join(" "));
    if (automaticApprovals && upgrades.some(row => before.pending.includes(row.id) && automaticApprovals[row.id] !== row.checksum))
      throw new Error("Automatic upgrade approval changed. Review pending upgrades before retrying.");
    await db.query(`CREATE TABLE IF NOT EXISTS public.roads_development_upgrades (
      id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const upgrade of upgrades.filter(row => before.pending.includes(row.id))) {
      if (upgrade.kind === "sql") {
        // Only the reviewed additive bootstrap is currently authorized. New SQL
        // upgrades must extend this allowlist in a reviewed code change.
        if (upgrade.id !== "001-loan-table" ||
            !/^--[^\n]*\nCREATE TABLE IF NOT EXISTS public\.prototype_loan_applications \(\s*loan_id text PRIMARY KEY,\s*document jsonb NOT NULL\s*\);\s*$/.test(upgrade.content))
          throw new Error("SQL upgrade is not approved. Review it before extending the runner.");
        await db.query(upgrade.content);
      } else {
        const rows = await db.query("SELECT loan_id, document FROM public.prototype_loan_applications FOR UPDATE");
        for (const row of rows.rows) {
          const next = upgradeLoanDocument(row.document, upgrade);
          if (next !== row.document)
            await db.query("UPDATE public.prototype_loan_applications SET document=$2::jsonb WHERE loan_id=$1", [row.loan_id, JSON.stringify(next)]);
        }
      }
      await db.query("INSERT INTO public.roads_development_upgrades (id, checksum) VALUES ($1,$2)", [upgrade.id, upgrade.checksum]);
    }
    const after = await inspectDatabase(db, upgrades);
    if (after.status !== "compatible") throw new Error("Post-upgrade validation failed. All changes will be rolled back.");
    await db.query("COMMIT");
    return after;
  } catch (error) { await db.query("ROLLBACK"); throw error; }
}
