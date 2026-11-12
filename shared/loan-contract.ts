import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { loans, borrowers } from "./schema";
import { LOAN_STAGES } from "./loan-stages";
import { feeRecordSchema } from "./fees";
import { feeCircumstancesSchema } from "./fee-circumstances";
import type { LoanBusinessRules } from "./business-rules";
import { operationsTeamSchema } from "./operations-team";

export const LOAN_DOCUMENT_VERSION = 1;
const fields = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]));
// Parcel is an optional text identifier (leading zeros and separators matter).
// Existing documents without it remain valid; saves persist it in the same
// subject-property JSON section without rewriting other loans.
export const subjectPropertySchema = fields.refine(
  value => value.parcel === undefined || typeof value.parcel === "string",
  "Parcel must be text.",
);
const ownedRow = z.object({ id: z.string(), borrowerId: z.string().optional() }).passthrough();
const income = z.array(z.object({
  incomeSources: z.array(z.object({ id: z.string() }).passthrough()),
}).passthrough());

/** Shared runtime contract. Unknown section keys remain forward-extensible;
 * recognized section structures are checked without stripping saved fields. */
export const sectionSchemas: Record<string, z.ZodTypeAny> = {
  "operations-team": operationsTeamSchema,
  withdrawal: z.object({ acknowledged: z.literal(true) }).strict(),
  "borrower-primary": fields, "borrower-secondary": fields,
  "loan-details": fields, "subject-property": subjectPropertySchema,
  "evaluation-1": fields, "evaluation-2": fields,
  income,
  "current-assets": z.array(ownedRow), "noncurrent-assets": z.array(ownedRow),
  "current-liabilities": z.array(ownedRow), "noncurrent-liabilities": z.array(ownedRow),
  fees: z.array(feeRecordSchema),
  "fee-circumstances": feeCircumstancesSchema,
  "origination-fee-initialized": z.boolean(),
  "credit-pulled": z.boolean(), "appraisal-split": z.boolean(),
  "credit-frozen": z.boolean(),
  // Accept the retired value in existing documents; decisionMode maps it to approval.
  "decision-mode": z.enum(["force-approval", "force-denial", "real-ede"]),
  "decision-outcome": z.enum(["approved", "denied"]).nullable(),
  "pricing-type": z.string(), "pricing-product": z.string(),
  "pricing-term": z.union([z.string(), z.number(), z.null()]),
  "credit-scores": z.record(z.number().int().min(300).max(850)),
};

const loanSchema = createSelectSchema(loans).passthrough().refine(
  loan => LOAN_STAGES.some(stage => stage === loan.stage), "Unknown loan stage.");
const borrowersSchema = z.array(createSelectSchema(borrowers).passthrough());
const opportunitySchema = z.object({
  region: z.string(), loanOfficer: z.string(), applicationDate: z.string(),
  queue: z.literal("Sales Support"), decision: z.string(), contractExpiryDate: z.string().optional(),
}).passthrough();
const sectionsSchema = z.record(z.unknown()).superRefine((sections, ctx) => {
  for (const [key, value] of Object.entries(sections)) {
    if (Object.hasOwn(sectionSchemas, key) && !sectionSchemas[key].safeParse(value).success)
      ctx.addIssue({ code: "custom", path: [key], message: "Section structure mismatch." });
  }
});
function checkBorrowers(
  snapshot: { loan: z.infer<typeof loanSchema>; borrowers: z.infer<typeof borrowersSchema> },
  ctx: z.RefinementCtx,
) {
  const seen = new Set<string>();
  for (const borrower of snapshot.borrowers) {
    if (borrower.loanId !== snapshot.loan.id || seen.has(borrower.id))
      ctx.addIssue({ code: "custom", path: ["borrowers"], message: "Borrower identity mismatch." });
    seen.add(borrower.id);
  }
}
const baselineSchema = z.object({
  capturedAt: z.string().datetime(),
  loan: loanSchema,
  borrowers: borrowersSchema,
  sections: sectionsSchema,
  opportunity: opportunitySchema,
}).passthrough().superRefine(checkBorrowers);

export const loanApplicationSchema = z.object({
  schemaVersion: z.number().int().min(0).max(LOAN_DOCUMENT_VERSION).optional(),
  loan: loanSchema,
  borrowers: borrowersSchema,
  mode: z.enum(["existing", "empty", "blend"]),
  generation: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  sections: sectionsSchema,
  changeLog: z.array(z.object({
    id: z.number(), field: z.string(), previousValue: z.string(), newValue: z.string(),
    changedBy: z.string(), position: z.string(), timestamp: z.string(),
    section: z.string(), navItem: z.string(),
  }).passthrough()).optional(),
  businessRules: z.custom<LoanBusinessRules>(value =>
    value !== null && typeof value === "object" && !Array.isArray(value)).optional(),
  meta: z.object({
    createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
    source: z.enum(["seed", "blank", "blend", "sf"]),
    opportunity: opportunitySchema.optional(),
    baseline: baselineSchema.optional(),
    creationAttempt: z.object({ key: z.string(), source: z.string() }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough().superRefine((app, ctx) => {
  checkBorrowers(app, ctx);
  if (app.meta?.baseline && app.meta.baseline.loan.id !== app.loan.id) {
    ctx.addIssue({ code: "custom", path: ["meta", "baseline", "loan", "id"], message: "Baseline loan identity mismatch." });
  }
});

export type LoanDocument = z.infer<typeof loanApplicationSchema>;
export class LoanContractError extends Error {
  constructor() {
    super("Loan data does not match this code version. Run npm run db:check in development and review the reported model differences before saving.");
  }
}
export function assertLoanDocument(value: unknown, loanId?: string): asserts value is LoanDocument {
  const result = loanApplicationSchema.safeParse(value);
  if (!result.success || (loanId !== undefined && result.data.loan.id !== loanId)) throw new LoanContractError();
}
