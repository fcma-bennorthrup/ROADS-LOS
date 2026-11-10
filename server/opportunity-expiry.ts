import { randomInt } from "node:crypto";
import type { LoanApplication } from "../shared/loan-application";
import type pg from "pg";

export function contractExpiry(createdAt: string, days = randomInt(1, 91)): string {
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("Invalid expiry offset");
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(createdAt));
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function ensureOpportunityExpiry(pool: Pick<pg.Pool, "query">, document: LoanApplication): Promise<LoanApplication> {
  const meta = document.meta;
  if (meta?.source !== "sf" || !meta.opportunity || meta.opportunity.contractExpiryDate !== undefined) return document;
  const expiry = contractExpiry(meta.createdAt);
  // Patch the current DB document, never overwrite unrelated fields from our snapshot.
  // CAS also prevents a concurrent demo reset from regaining discarded metadata.
  const result = await pool.query(
    `UPDATE prototype_loan_applications SET document =
       jsonb_set(jsonb_set(document, '{meta,opportunity,contractExpiryDate}', to_jsonb($2::text)),
         '{revision}', to_jsonb($3::int + 1))
     WHERE loan_id=$1 AND (document->>'revision')::int=$3
       AND (document->>'generation')::int=$4
       AND document->'meta'->>'source'='sf'
       AND document->'meta'->'opportunity' IS NOT NULL
       AND NOT (document->'meta'->'opportunity' ? 'contractExpiryDate')
     RETURNING document`,
    [document.loan.id, expiry, document.revision, document.generation]);
  if (result.rows[0]) return result.rows[0].document;
  const latest = await pool.query("SELECT document FROM prototype_loan_applications WHERE loan_id=$1", [document.loan.id]);
  if (!latest.rows[0]) throw new Error("Loan disappeared while initializing expiry");
  return ensureOpportunityExpiry(pool, latest.rows[0].document);
}
