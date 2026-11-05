import type { Express } from "express";
import pg from "pg";
import { z } from "zod";
import { storage } from "./storage";
import { applicationView, type LoanApplication } from "../shared/loan-application";
import { changesForSave } from "../shared/loan-history";
import { evaluateLoanRules } from "../shared/business-rules";
import { triggerTridDemo } from "../shared/business-rules/trigger-trid-demo";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function load(id: string): Promise<LoanApplication | null> {
  const existing = await pool.query("SELECT document FROM prototype_loan_applications WHERE loan_id=$1", [id]);
  if (existing.rows[0]) {
    const document: LoanApplication = existing.rows[0].document;
    if (document.businessRules?.trid && document.businessRules?.ecoa) return document;
    // Adopt existing saved loans once; persist any trigger before a later edit
    // can remove one of its inputs. CAS avoids racing a collaborator's save.
    const initialized = { ...document,
      // Revision zero is the existing browser-data adoption marker.
      revision: document.revision === 0 ? 0 : document.revision + 1,
      businessRules: evaluateLoanRules(document) };
    const result = await pool.query(
      `UPDATE prototype_loan_applications SET document=$2
       WHERE loan_id=$1 AND (document->>'revision')::int=$3 RETURNING document`,
      [id, JSON.stringify(initialized), document.revision]);
    return result.rows[0]?.document ?? load(id);
  }
  const loan = await storage.getLoan(id);
  if (!loan) return null;
  const document: LoanApplication = { loan, borrowers: await storage.getBorrowersByLoanId(id),
    mode: "existing", generation: 0, revision: 0, sections: {} };
  document.businessRules = evaluateLoanRules(document);
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
  action: z.enum(["reset", "blend", "trid"]),
  generation: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  confirmed: z.literal(true),
  sections: z.record(z.unknown()).optional(),
});

export function registerLoanApplicationRoutes(app: Express) {
  app.get("/api/loans/:id/application", async (req, res) => {
    try {
      const document = await load(String(req.params.id));
      if (!document) return void res.status(404).json({ error: "Loan not found" });
      res.set("Cache-Control", "no-store").json(document);
    } catch { res.status(503).json({ error: "Loan data could not be loaded from the database." }); }
  });
  app.get("/api/loans/:id", async (req, res) => {
    try {
      const document = await load(String(req.params.id));
      if (!document) return void res.status(404).json({ error: "Loan not found" });
      res.set("Cache-Control", "no-store").json(applicationView(document));
    } catch { res.status(503).json({ error: "Loan data could not be loaded from the database." }); }
  });
  app.put("/api/loans/:id/application", async (req, res) => {
    const parsed = writeSchema.safeParse(req.body);
    if (!parsed.success || JSON.stringify(req.body).length > 400_000)
      return void res.status(400).json({ error: "Invalid loan data." });
    const { section, value, generation, revision } = parsed.data;
    if (["__proto__", "constructor", "prototype"].includes(section))
      return void res.status(400).json({ error: "Invalid section." });
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
         jsonb_set(jsonb_set(jsonb_set(jsonb_set(document, ARRAY['sections',$2], $3::jsonb), '{revision}', to_jsonb($5::int + 1)), '{changeLog}', $6::jsonb), '{businessRules}', $7::jsonb)
         WHERE loan_id=$1 AND (document->>'generation')::int=$4 AND (document->>'revision')::int=$5 RETURNING document`,
        [req.params.id, section, JSON.stringify(value ?? null), generation, revision, JSON.stringify(history), JSON.stringify(businessRules)]);
      if (!result.rowCount) return void res.status(409).json({ error: "This loan changed in another session. Reload the latest loan before saving." });
      res.json(result.rows[0].document);
    } catch { res.status(503).json({ error: "Changes were not saved. Retry when the database is available." }); }
  });
  app.post("/api/loans/:id/application/demo", async (req, res) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success || JSON.stringify(req.body).length > 400_000) return void res.status(400).json({ error: "Confirm the demo action before continuing." });
    try {
      const current = await load(String(req.params.id));
      if (!current) return void res.status(404).json({ error: "Loan not found" });
      const { action, generation, revision } = parsed.data;
      if (action === "trid") {
        if (current.generation !== generation || current.revision !== revision)
          return void res.status(409).json({ error: "The loan changed. Reload it before triggering TRID." });
        if (current.businessRules?.trid.status === "satisfied")
          return void res.status(409).json({ error: "TRID is already satisfied. Reset the demo loan to start a new journey." });
        const next = triggerTridDemo(current, parsed.data.sections ?? {});
        const result = await pool.query(
          `UPDATE prototype_loan_applications SET document=$2
           WHERE loan_id=$1 AND (document->>'generation')::int=$3 AND (document->>'revision')::int=$4 RETURNING document`,
          [req.params.id, JSON.stringify(next), generation, revision]);
        if (!result.rowCount) return void res.status(409).json({ error: "The loan changed. Reload it before triggering TRID." });
        return void res.json(result.rows[0].document);
      }
      const seed = await storage.getLoan(String(req.params.id)) ?? current.loan;
      if (!seed) return void res.status(404).json({ error: "Loan template not found" });
      const loan = { ...seed };
      // A POS import is an application, not an approval, appraisal, or rate lock.
      for (const key of ["financedFees", "taxesInsurance", "finalRate", "principalInterest", "totalMonthlyPayment", "piti", "dti", "lcv", "totalCv", "cashReserves", "cashToClose", "apr"] as const) loan[key] = "0";
      loan.stage = "Customer Application";
      loan.product = "";
      loan.pweCbScore = 0;
      loan.ruleOfXx = null;
      loan.ecoaDaysRemaining = 0;
      loan.tridDaysRemaining = 0;
      loan.cifNumber = "";
      loan.loanType = action === "blend" ? "Purchase" : "";
      loan.applicationType = action === "blend" ? "Joint Credit Application" : "";
      loan.amountRequested = action === "blend" ? "145000.00" : "0";
      loan.displayAmount = loan.amountRequested;
      loan.totalLoanAmount = loan.amountRequested;
      loan.primaryBorrowerName = action === "blend" ? "Richard Jamerson" : "";
      const borrowers = ["primary", "secondary"].map((role, index) => ({
        id: `${loan.id}-${role}`, loanId: loan.id, isPrimary: index === 0,
        name: action === "blend" ? `${index === 0 ? "Richard" : "Jane"} Jamerson` : "",
        email: action === "blend" ? `${index === 0 ? "richard" : "jane"}.jamerson@example.com` : "",
        phone: action === "blend" ? `(502) 555-${index === 0 ? "0142" : "0188"}` : "",
      }));
      const next: LoanApplication = { loan, borrowers, mode: action === "blend" ? "blend" : "empty",
        changeLog: [],
        generation: generation + 1, revision: revision + 1,
        sections: action === "blend" ? Object.fromEntries(
          Object.entries(parsed.data.sections ?? {}).filter(([key]) =>
            ["borrower-primary", "borrower-secondary", "loan-details", "income", "current-assets", "noncurrent-assets", "current-liabilities", "noncurrent-liabilities", "subject-property", "fees"].includes(key)),
        ) : {} };
      const checklistKey = `storage:loan-checklist-statuses:${loan.id}`;
      const previousChecklist = current.sections[checklistKey];
      if (typeof previousChecklist === "string") {
        const statuses = JSON.parse(previousChecklist);
        next.sections[checklistKey] = JSON.stringify(Object.fromEntries(
          Object.entries(statuses).filter(([, value]) => Array.isArray(value))
            .map(([key, value]) => [key, (value as unknown[]).map(() => "not-started")]),
        ));
      }
      next.businessRules = evaluateLoanRules(next);
      const result = await pool.query(
        `UPDATE prototype_loan_applications SET document=$2
         WHERE loan_id=$1 AND (document->>'generation')::int=$3 AND (document->>'revision')::int=$4 RETURNING document`,
        [req.params.id, JSON.stringify(next), generation, revision]);
      if (!result.rowCount) return void res.status(409).json({ error: "The loan changed. Reload it and confirm the action again." });
      res.json(result.rows[0].document);
    } catch { res.status(503).json({ error: "The demo action did not complete. No success was confirmed." }); }
  });
}
