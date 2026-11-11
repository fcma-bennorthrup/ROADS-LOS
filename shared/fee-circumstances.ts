import { z } from "zod";
import type { FeeRow } from "./fees";

const feeSnapshotSchema = z.object({
  id: z.string(), fee: z.string(),
  // Older fee rows can hold numeric amounts; keep them readable without
  // changing the loan's fee table or its amount formatting.
  leAmount: z.union([z.string(), z.number().finite()]).transform(String),
  cdAmount: z.union([z.string(), z.number().finite()]).transform(String),
  methodOfPayment: z.string().default("Cash"), paidBy: z.string().default("Buyer"),
  paidTo: z.string().optional(), shoppedForProvider: z.boolean().optional(),
});

// Regulation Z, 12 CFR 1026.19(e)(3)(iv)(A)–(F).
// Recording a reason does not establish tolerance-reset eligibility or trigger TRID.
export const CIRCUMSTANCE_REASONS = [
  { value: "not-valid", label: "Not a valid change of circumstance" },
  { value: "settlement-charges", label: "Changed circumstance affecting settlement charges" },
  { value: "eligibility", label: "Changed circumstance affecting eligibility" },
  { value: "consumer-request", label: "Revisions requested by the consumer" },
  { value: "rate-dependent", label: "Interest rate dependent charges" },
  { value: "expiration", label: "Expiration of the Loan Estimate" },
  { value: "construction-delay", label: "Delayed settlement on a new-construction loan" },
] as const;
export const circumstanceReasonSchema = z.enum([
  "not-valid", "settlement-charges", "eligibility", "consumer-request",
  "rate-dependent", "expiration", "construction-delay",
]);
export type CircumstanceReason = z.infer<typeof circumstanceReasonSchema>;
export const circumstanceRecordSchema = z.object({
  id: z.string(), savedAt: z.string().datetime(), reason: circumstanceReasonSchema,
  context: z.string().trim().min(1).max(5000),
  changes: z.array(z.object({ before: feeSnapshotSchema, after: feeSnapshotSchema.nullable() })),
});
export const feeCircumstancesSchema = z.object({
  pending: z.array(feeSnapshotSchema),
  records: z.array(circumstanceRecordSchema),
});
export type CircumstanceRecord = z.infer<typeof circumstanceRecordSchema>;
export type FeeCircumstances = z.infer<typeof feeCircumstancesSchema>;
export const EMPTY_CIRCUMSTANCES: FeeCircumstances = { pending: [], records: [] };
export const FEE_CIRCUMSTANCES_KEY = "fee-circumstances";

function comparable(row: FeeRow) {
  return [row.fee, row.methodOfPayment ?? "Cash", row.paidBy ?? "Buyer",
    row.paidTo ?? "", row.leAmount, row.cdAmount, row.shoppedForProvider ?? false];
}
export function appraisalChanged(before: FeeRow, after: FeeRow | undefined) {
  return !after || JSON.stringify(comparable(before)) !== JSON.stringify(comparable(after));
}
export function trackAppraisalEdits(state: FeeCircumstances, before: FeeRow[], after: FeeRow[]): FeeCircumstances {
  const pending = [...state.pending];
  for (const row of before) {
    if (row.fee.trim().toLowerCase() === "appraisal fee" &&
        !pending.some(item => item.id === row.id) &&
        appraisalChanged(row, after.find(item => item.id === row.id))) pending.push(row);
  }
  return { ...state, pending };
}
export function pendingAppraisalChanges(state: FeeCircumstances, fees: FeeRow[]) {
  return state.pending.flatMap(before => {
    const after = fees.find(row => row.id === before.id);
    return appraisalChanged(before, after) ? [{ before, after: after ?? null }] : [];
  });
}
