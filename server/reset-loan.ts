import type pg from "pg";
import type { LoanApplication } from "../shared/loan-application";
import { assertLoanDocument } from "../shared/loan-contract";
import { evaluateJointCredit } from "../shared/business-rules/joint-credit";
import { resetToBaseline } from "../shared/loan-events/baseline";
import { allocateCif, newSfOpportunity } from "./sf-opportunity";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function saveReset(db: Pick<pg.PoolClient, "query">, current: LoanApplication) {
  const next = resetToBaseline(current);
  assertLoanDocument(next, current.loan.id);
  const result = await db.query(
    `UPDATE prototype_loan_applications SET document=jsonb_set($2::jsonb, '{meta,updatedAt}', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
     WHERE loan_id=$1 AND (document->>'generation')::int=$3 AND (document->>'revision')::int=$4 RETURNING document`,
    [current.loan.id, JSON.stringify(next), current.generation, current.revision],
  );
  return (result.rows[0]?.document ?? null) as LoanApplication | null;
}

/** Legacy baseline capture and reset commit together, with creation's CIF lock. */
export async function resetLoan(pool: pg.Pool, current: LoanApplication): Promise<LoanApplication | null> {
  if (current.meta?.baseline) return saveReset(pool, current);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(784219)");
    const result = await client.query(
      "SELECT document FROM prototype_loan_applications WHERE loan_id=$1 FOR UPDATE", [current.loan.id],
    );
    const locked: LoanApplication | undefined = result.rows[0]?.document;
    if (!locked || locked.generation !== current.generation || locked.revision !== current.revision) {
      await client.query("ROLLBACK");
      return null;
    }
    assertLoanDocument(locked, current.loan.id);
    if (!locked.meta) throw new Error("Loan creation metadata is missing.");
    if (!locked.meta.baseline) {
      let cif = locked.loan.cifNumber;
      if (!cif?.trim()) {
        const used = await client.query("SELECT document->'loan'->>'cifNumber' AS cif FROM prototype_loan_applications");
        cif = allocateCif(new Set(used.rows.map(row => row.cif)));
      }
      const identity = (index: number) => {
        const key = index === 0 ? "borrower-primary" : "borrower-secondary";
        if (locked.sections[key]) return record(locked.sections[key]);
        // Seed-era loans can have their identity only in the borrower records.
        const borrower = locked.borrowers[index];
        const [firstName = "", ...lastName] = (borrower?.name ?? "").trim().split(/\s+/);
        return { firstName, lastName: lastName.join(" "), phone: borrower?.phone, email: borrower?.email };
      };
      const count = Math.min(2, Math.max(1, evaluateJointCredit(locked).borrowerCount)) as 1 | 2;
      const opportunity = newSfOpportunity(
        locked.loan.id, locked.loan.loanNumber, cif!, new Date(locked.meta.createdAt), count,
        {
          primary: identity(0), secondary: identity(1),
          loanDetails: locked.sections["loan-details"] ? record(locked.sections["loan-details"]) : {
            requestedLoanAmount: locked.loan.amountRequested,
            loanType: ({ Purchase: "purchase", Construction: "construction", "Cash Out": "cash_out", Refinance: "refinance" } as Record<string, string>)[locked.loan.loanType] ?? "",
          },
          opportunity: locked.meta.opportunity,
        },
      );
      locked.meta.baseline = opportunity.meta!.baseline;
    }
    const reset = await saveReset(client, locked);
    await client.query(reset ? "COMMIT" : "ROLLBACK");
    return reset;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
