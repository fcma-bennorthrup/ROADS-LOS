import type { Express, Response } from "express";
import pg from "pg";
import { z } from "zod";
import { storage } from "./storage";
import { applicationView, type LoanApplication } from "../shared/loan-application";
import { changesForSave } from "../shared/loan-history";
import { evaluateLoanRules } from "../shared/business-rules";
import { triggerTridDemo } from "../shared/business-rules/trigger-trid-demo";
import { applyTridDemoAction } from "../shared/business-rules/trid-demo-actions";
import { populateDemoCredit } from "../shared/demo-credit";
import { resetChecklistData } from "../shared/reset-checklist-data";
import { newLoanApplication } from "../shared/loan-factory";
import { randomUUID } from "node:crypto";
import { allocateCif, newSfOpportunity } from "./sf-opportunity";
import { ensureOpportunityExpiry } from "./opportunity-expiry";
import { LOAN_STAGES } from "../shared/loan-stages";
import { pipelineView } from "../shared/pipeline";
import { assertLoanDocument, LoanContractError, LOAN_DOCUMENT_VERSION, sectionSchemas } from "../shared/loan-contract";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
function loanFailure(res: Response, error: unknown, fallback: string) {
  res.status(error instanceof LoanContractError ? 409 : 503)
    .json({ error: error instanceof LoanContractError ? error.message : fallback });
}

async function load(id: string): Promise<LoanApplication | null> {
  const existing = await pool.query("SELECT document FROM prototype_loan_applications WHERE loan_id=$1", [id]);
  if (existing.rows[0]) {
    let document: LoanApplication = existing.rows[0].document;
    assertLoanDocument(document, id);
    document = await ensureOpportunityExpiry(pool, document);
    if (document.meta && document.businessRules?.trid && document.businessRules?.ecoa && document.businessRules?.jointCredit && document.businessRules?.loanDecision && document.businessRules?.primaryWageEarner) return document;
    // Adopt existing saved loans once; persist any trigger before a later edit
    // can remove one of its inputs. CAS avoids racing a collaborator's save.
    const initialized = { ...document,
      // Revision zero is the existing browser-data adoption marker.
      revision: document.revision === 0 ? 0 : document.revision + 1,
      meta: document.meta ?? {
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        source: id === "1" ? "seed" as const : document.mode === "blend" ? "blend" as const : "blank" as const,
      },
      businessRules: evaluateLoanRules(document) };
    const result = await pool.query(
      `UPDATE prototype_loan_applications SET document=jsonb_set($2::jsonb, '{meta,updatedAt}', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
       WHERE loan_id=$1 AND (document->>'revision')::int=$3 RETURNING document`,
      [id, JSON.stringify(initialized), document.revision]);
    return result.rows[0]?.document ?? load(id);
  }
  if (id !== "1") return null;
  const loan = await storage.getLoan(id);
  if (!loan) return null;
  const document: LoanApplication = { loan, borrowers: await storage.getBorrowersByLoanId(id),
    mode: "existing", schemaVersion: LOAN_DOCUMENT_VERSION, generation: 0, revision: 0, sections: {},
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: "seed" } };
  document.businessRules = evaluateLoanRules(document);
  assertLoanDocument(document, id);
  await pool.query("INSERT INTO prototype_loan_applications (loan_id, document) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, JSON.stringify(document)]);
  return (await pool.query("SELECT document FROM prototype_loan_applications WHERE loan_id=$1", [id])).rows[0].document;
}

const writeSchema = z.object({
  generation: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  section: z.string().min(1).max(160).regex(/^[a-zA-Z0-9:_-]+$/),
  value: z.unknown(),
  baseline: z.unknown().optional(),
});
const actionSchema = z.object({
  action: z.enum(["reset", "blend", "trid", "checklist", "trid-reset", "trid-manual"]),
  borrowerCount: z.union([z.literal(1), z.literal(2)]).optional().default(2),
  generation: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  confirmed: z.literal(true),
  sections: z.record(z.unknown()).optional(),
});

export function registerLoanApplicationRoutes(app: Express) {
  app.get("/api/loans", async (_req, res) => {
    try {
      // Ensure the seed is visible even before anyone has opened its detail page.
      await load("1");
      const rows = await pool.query("SELECT loan_id FROM prototype_loan_applications");
      const documents = await Promise.all(rows.rows.map(row => load(row.loan_id)));
      const loans = documents.filter((row): row is LoanApplication => row !== null).map(pipelineView);
      loans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.loanNumber.localeCompare(b.loanNumber));
      res.set("Cache-Control", "no-store").json(loans);
    } catch (error) { loanFailure(res, error, "The pipeline could not be loaded from the database."); }
  });
  app.post("/api/loans", async (req, res) => {
    const parsed = z.object({ source: z.enum(["blank", "sf"]),
      idempotencyKey: z.string().uuid().optional() }).strict().safeParse(req.body);
    if (!parsed.success)
      return void res.status(400).json({ error: "Choose a supported application source to create a loan." });
    const { source, idempotencyKey } = parsed.data;
    let client: pg.PoolClient | undefined;
    try {
      await load("1");
      client = await pool.connect();
      await client.query("BEGIN");
      // Serialize number allocation across app processes without adding a table.
      await client.query("SELECT pg_advisory_xact_lock(784219)");
      // Look up the durable receipt inside the same lock as allocation/insertion.
      // Legacy callers may omit the key; existing documents need no migration.
      if (idempotencyKey) {
        const previous = await client.query(
          "SELECT document FROM prototype_loan_applications WHERE document->'meta'->'creationAttempt'->>'key'=$1",
          [idempotencyKey]);
        if (previous.rows[0]) {
          const saved: LoanApplication = previous.rows[0].document;
          assertLoanDocument(saved, saved.loan.id);
          if (saved.meta?.creationAttempt?.source !== source) {
            await client.query("ROLLBACK");
            return void res.status(409).json({ error: "This creation attempt belongs to a different application source." });
          }
          await client.query("COMMIT");
          return void res.status(201).json({ id: saved.loan.id, loanNumber: saved.loan.loanNumber });
        }
      }
      const allocation = await client.query(`SELECT GREATEST(COALESCE(MAX(
        CASE WHEN document->'loan'->>'loanNumber' ~ '^[0-9]{1,9}$'
        THEN (document->'loan'->>'loanNumber')::bigint END), 123456789), 123456789) + 1 AS number
        FROM prototype_loan_applications`);
      const loanNumber = String(allocation.rows[0].number);
      if (loanNumber.length > 9) throw new Error("Loan number range exhausted.");
      const id = randomUUID();
      let document: LoanApplication;
      if (source === "sf") {
        const existing = await client.query("SELECT document->'loan'->>'cifNumber' AS cif FROM prototype_loan_applications");
        const cif = allocateCif(new Set(existing.rows.map(row => row.cif)));
        document = newSfOpportunity(id, loanNumber, cif);
      } else {
        document = newLoanApplication({ id, loanNumber, source: "blank", borrowerCount: 2 });
      }
      if (idempotencyKey) document.meta!.creationAttempt = { key: idempotencyKey, source };
      assertLoanDocument(document, id);
      const inserted = await client.query(
        "INSERT INTO prototype_loan_applications (loan_id, document) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING loan_id",
        [id, JSON.stringify(document)]);
      if (!inserted.rowCount) throw new Error("Loan identity collision.");
      await client.query("COMMIT");
      res.status(201).json({ id, loanNumber });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      loanFailure(res, error, "The loan could not be created. No success was confirmed.");
    } finally { client?.release(); }
  });
  app.put("/api/loans/:id/stage", async (req, res) => {
    const parsed = z.object({ stage: z.enum(LOAN_STAGES),
      generation: z.number().int().nonnegative(), revision: z.number().int().nonnegative() }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid loan stage." });
    try {
      const current = await load(String(req.params.id));
      if (!current) return void res.status(404).json({ error: "Loan not found" });
      const { stage, generation, revision } = parsed.data;
      const result = await pool.query(
        `UPDATE prototype_loan_applications SET document =
         jsonb_set(jsonb_set(jsonb_set(document, '{loan,stage}', to_jsonb($2::text)), '{revision}', to_jsonb($4::int + 1)),
          '{meta,updatedAt}', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
         WHERE loan_id=$1 AND (document->>'generation')::int=$3 AND (document->>'revision')::int=$4 RETURNING document`,
        [req.params.id, stage, generation, revision]);
      if (!result.rowCount) return void res.status(409).json({ error: "This loan changed in another session. Reload the latest loan before saving." });
      res.json(result.rows[0].document);
    } catch (error) { loanFailure(res, error, "The stage was not saved. Retry when the database is available."); }
  });
  app.post("/api/loans/:id/application/credit", async (req, res) => {
    const parsed = z.object({
      generation: z.number().int().nonnegative(),
      revision: z.number().int().nonnegative(),
    }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid credit request." });
    try {
      const current = await load(String(req.params.id));
      if (!current) return void res.status(404).json({ error: "Loan not found." });
      const { generation, revision } = parsed.data;
      if (current.generation !== generation || current.revision !== revision)
        return void res.status(409).json({ error: "The loan changed. Reload before pulling credit." });
      let next: LoanApplication;
      try { next = populateDemoCredit(current); }
      catch (error) { return void res.status(400).json({ error: (error as Error).message }); }
      assertLoanDocument(next, current.loan.id);
      const result = await pool.query(
        `UPDATE prototype_loan_applications SET document=jsonb_set($2::jsonb, '{meta,updatedAt}', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
         WHERE loan_id=$1 AND (document->>'generation')::int=$3 AND (document->>'revision')::int=$4 RETURNING document`,
        [req.params.id, JSON.stringify(next), generation, revision]);
      if (!result.rowCount) return void res.status(409).json({ error: "The loan changed. Reload before pulling credit." });
      res.json(result.rows[0].document);
    } catch (error) { loanFailure(res, error, "Credit could not be saved. Please retry."); }
  });
  app.get("/api/loans/:id/application", async (req, res) => {
    try {
      const document = await load(String(req.params.id));
      if (!document) return void res.status(404).json({ error: "Loan not found" });
      res.set("Cache-Control", "no-store").json(document);
    } catch (error) { loanFailure(res, error, "Loan data could not be loaded from the database."); }
  });
  app.get("/api/loans/:id", async (req, res) => {
    try {
      const document = await load(String(req.params.id));
      if (!document) return void res.status(404).json({ error: "Loan not found" });
      res.set("Cache-Control", "no-store").json(applicationView(document));
    } catch (error) { loanFailure(res, error, "Loan data could not be loaded from the database."); }
  });
  app.put("/api/loans/:id/application", async (req, res) => {
    const parsed = writeSchema.safeParse(req.body);
    if (!parsed.success || JSON.stringify(req.body).length > 400_000)
      return void res.status(400).json({ error: "Invalid loan data." });
    const { section, value, generation, revision } = parsed.data;
    if (["__proto__", "constructor", "prototype"].includes(section))
      return void res.status(400).json({ error: "Invalid section." });
    if ((Object.hasOwn(sectionSchemas, section) && !sectionSchemas[section].safeParse(value).success) ||
        (section.startsWith("storage:") && value !== null && typeof value !== "string"))
      return void res.status(400).json({ error: "This section does not match the shared loan data model. No changes were saved." });
    try {
      const current = await load(String(req.params.id));
      if (!current || current.generation !== generation || current.revision !== revision)
        return void res.status(409).json({ error: "This loan changed in another session. Reload the latest loan before saving." });
      // Existing prototype defaults live in the client until first saved. Only use
      // that baseline when no authoritative saved section exists.
      const previous = Object.hasOwn(current.sections, section)
        ? current.sections[section] : parsed.data.baseline;
      const history = [...(current.changeLog ?? []),
        ...changesForSave(section, previous, value, revision + 1)];
      const businessRules = evaluateLoanRules({ ...current, sections: { ...current.sections, [section]: value } });
      const result = await pool.query(
        `UPDATE prototype_loan_applications SET document =
         jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(document, ARRAY['sections',$2], $3::jsonb), '{revision}', to_jsonb($5::int + 1)), '{changeLog}', $6::jsonb), '{businessRules}', $7::jsonb),
          '{meta,updatedAt}', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
         WHERE loan_id=$1 AND (document->>'generation')::int=$4 AND (document->>'revision')::int=$5 RETURNING document`,
        [req.params.id, section, JSON.stringify(value ?? null), generation, revision, JSON.stringify(history), JSON.stringify(businessRules)]);
      if (!result.rowCount) return void res.status(409).json({ error: "This loan changed in another session. Reload the latest loan before saving." });
      res.json(result.rows[0].document);
    } catch (error) { loanFailure(res, error, "Changes were not saved. Retry when the database is available."); }
  });
  app.post("/api/loans/:id/application/demo", async (req, res) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success || JSON.stringify(req.body).length > 400_000) return void res.status(400).json({ error: "Confirm the demo action before continuing." });
    try {
      const current = await load(String(req.params.id));
      if (!current) return void res.status(404).json({ error: "Loan not found" });
      const { action, generation, revision } = parsed.data;
      if (action === "checklist" || action === "trid-reset" || action === "trid-manual") {
        if (current.generation !== generation || current.revision !== revision)
          return void res.status(409).json({ error: "The loan changed. Reload before resetting checklist data." });
        const next = action === "checklist" ? resetChecklistData(current) : applyTridDemoAction(current, action);
        assertLoanDocument(next, current.loan.id);
        const result = await pool.query(
          `UPDATE prototype_loan_applications SET document=jsonb_set($2::jsonb, '{meta,updatedAt}', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
           WHERE loan_id=$1 AND (document->>'generation')::int=$3 AND (document->>'revision')::int=$4 RETURNING document`,
          [req.params.id, JSON.stringify(next), generation, revision]);
        if (!result.rowCount) return void res.status(409).json({ error: "The loan changed. Reload before resetting checklist data." });
        return void res.json(result.rows[0].document);
      }
      if (action === "trid") {
        if (current.generation !== generation || current.revision !== revision)
          return void res.status(409).json({ error: "The loan changed. Reload it before triggering TRID." });
        if (current.businessRules?.trid.status === "satisfied")
          return void res.status(409).json({ error: "TRID is already satisfied. Reset the demo loan to start a new journey." });
        const next = triggerTridDemo(current, parsed.data.sections ?? {});
        assertLoanDocument(next, current.loan.id);
        const result = await pool.query(
          `UPDATE prototype_loan_applications SET document=jsonb_set($2::jsonb, '{meta,updatedAt}', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
           WHERE loan_id=$1 AND (document->>'generation')::int=$3 AND (document->>'revision')::int=$4 RETURNING document`,
          [req.params.id, JSON.stringify(next), generation, revision]);
        if (!result.rowCount) return void res.status(409).json({ error: "The loan changed. Reload it before triggering TRID." });
        return void res.json(result.rows[0].document);
      }
      const next = newLoanApplication({
        id: current.loan.id, loanNumber: current.loan.loanNumber,
        source: action === "blend" ? "blend" : "blank",
        borrowerCount: parsed.data.borrowerCount, sections: parsed.data.sections,
        generation: generation + 1, revision: revision + 1,
      });
      const checklistKey = `storage:loan-checklist-statuses:${current.loan.id}`;
      // A demo replacement is not a new loan: retain its original creation time.
      if (current.meta) next.meta!.createdAt = current.meta.createdAt;
      if (current.meta?.creationAttempt) next.meta!.creationAttempt = current.meta.creationAttempt;
      const previousChecklist = current.sections[checklistKey];
      if (typeof previousChecklist === "string") {
        const statuses = JSON.parse(previousChecklist);
        next.sections[checklistKey] = JSON.stringify(Object.fromEntries(
          Object.entries(statuses).filter(([, value]) => Array.isArray(value))
            .map(([key, value]) => [key, (value as unknown[]).map(() => "not-started")]),
        ));
      }
      next.businessRules = evaluateLoanRules(next);
      assertLoanDocument(next, current.loan.id);
      const result = await pool.query(
        `UPDATE prototype_loan_applications SET document=jsonb_set($2::jsonb, '{meta,updatedAt}', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
         WHERE loan_id=$1 AND (document->>'generation')::int=$3 AND (document->>'revision')::int=$4 RETURNING document`,
        [req.params.id, JSON.stringify(next), generation, revision]);
      if (!result.rowCount) return void res.status(409).json({ error: "The loan changed. Reload it and confirm the action again." });
      res.json(result.rows[0].document);
    } catch (error) { loanFailure(res, error, "The demo action did not complete. No success was confirmed."); }
  });
}
