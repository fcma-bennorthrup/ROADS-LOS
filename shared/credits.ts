import { z } from "zod";

export const CREDIT_TYPES = [
  "Lender Credit - Promotion",
  "Lender Credit - Tolerance Cure",
  "Seller Credit (Lump Sum)",
] as const;

/** Accept dollars/cents with optional standard thousands separators. */
export function normalizeCreditAmount(input: string): string | null {
  const value = input.trim().replace(/^\$\s*/, "");
  if (!value) return "0.00";
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value.replaceAll(",", ""));
  if (!Number.isFinite(amount) || amount > Number.MAX_SAFE_INTEGER / 100) return null;
  return amount.toFixed(2);
}

export const creditRecordSchema = z.object({
  id: z.string().min(1),
  creditType: z.enum(CREDIT_TYPES),
  cdAmount: z.string().min(1).refine(value => normalizeCreditAmount(value) !== null, "Enter a valid non-negative credit amount."),
  description: z.string(),
}).passthrough();

export type CreditRow = z.infer<typeof creditRecordSchema>;
