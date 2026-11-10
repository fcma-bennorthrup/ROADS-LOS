import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { loans, borrowers } from "./schema";
import { LOAN_STAGES } from "./loan-stages";
import type { LoanBusinessRules } from "./business-rules";

export const LOAN_DOCUMENT_VERSION = 1;
const object = z.record(z.unknown());
const fields = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]));
const ownedRow = z.object({ id: z.string(), borrowerId: z.string().optional() }).passthrough();
const income = z.array(z.object({
  incomeSources: z.array(z.object({ id: z.string() }).passthrough()),
}).passthrough());

/** Shared runtime contract. Unknown section keys remain forward-extensible;
 * recognized section structures are checked without stripping saved fields. */
export const sectionSchemas: Record<string, z.ZodTypeAny> = {
  "borrower-primary": fields, "borrower-secondary": fields,
  "loan-details": fields, "subject-property": fields,
  "evaluation-1": fields, "evaluation-2": fields,
  income,
  "current-assets": z.array(ownedRow), "noncurrent-assets": z.array(ownedRow),
  "current-liabilities": z.array(ownedRow), "noncurrent-liabilities": z.array(ownedRow),
  fees: z.array(object),
  "credit-pulled": z.boolean(), "appraisal-split": z.boolean(),
  "pricing-type": z.string(), "pricing-product": z.string(),
  "pricing-term": z.union([z.string(), z.number(), z.null()]),
  "credit-scores": z.record(z.number().int().min(300).max(850)),
};

export const loanApplicationSchema = z.object({
  schemaVersion: z.number().int().min(0).max(LOAN_DOCUMENT_VERSION).optional(),
  loan: createSelectSchema(loans).passthrough().refine(
    loan => LOAN_STAGES.some(stage => stage === loan.stage), "Unknown loan stage."),
  borrowers: z.array(createSelectSchema(borrowers).passthrough()),
  mode: z.enum(["existing", "empty", "blend"]),
  generation: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  sections: z.record(z.unknown()),
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
    creationAttempt: z.object({
      key: z.string().uuid(),
      source: z.enum(["blank", "sf"]),
    }).optional(),
    opportunity: z.object({
      region: z.enum(["500", "502", "504"]),
      loanOfficer: z.enum(["Sarah Williams", "Rylee Alcorn", "Connor Welch"]),
      applicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      queue: z.literal("Sales Support"),
      decision: z.literal(""),
    }).optional(),
  }).passthrough().optional(),
}).passthrough().superRefine((app, ctx) => {
  const seen = new Set<string>();
  for (const borrower of app.borrowers) {
    if (borrower.loanId !== app.loan.id || seen.has(borrower.id))
      ctx.addIssue({ code: "custom", path: ["borrowers"], message: "Borrower identity mismatch." });
    seen.add(borrower.id);
  }
  for (const [key, value] of Object.entries(app.sections)) {
    if (Object.hasOwn(sectionSchemas, key) && !sectionSchemas[key].safeParse(value).success)
      ctx.addIssue({ code: "custom", path: ["sections", key], message: "Section structure mismatch." });
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
