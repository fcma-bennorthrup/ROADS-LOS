import { z } from "zod";

/** Fee editor values live in each loan's existing fees JSON section. */
export interface FeeRow {
  id: string;
  fee: string;
  leAmount: string;
  cdAmount: string;
  methodOfPayment: string;
  paidBy: string;
  paidTo?: string;
  shoppedForProvider?: boolean;
  waived?: boolean;
  waiver?: { amount: string; entire: boolean; leBase: string; cdBase: string };
}

/** Preserve legacy fee fields without normalizing amounts or payment choices.
 * New optional fields are validated without requiring a backfill of old loans. */
export const feeRecordSchema = z.object({
  paidTo: z.string().optional(),
  shoppedForProvider: z.boolean().optional(),
  waived: z.boolean().optional(),
  waiver: z.object({
    amount: z.string(), entire: z.boolean(), leBase: z.string(), cdBase: z.string(),
  }).optional(),
}).passthrough();

/** Keep gross amounts so repeated edits do not apply a waiver twice. */
export function applyFeeWaiver(row: FeeRow, amount: string, entire: boolean): FeeRow {
  const cents = (value: string) => {
    const cleaned = String(value).trim().replace(/^\$/, "").replace(/,/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error("Enter a valid dollar amount with up to two decimal places.");
    const result = Math.round(Number(cleaned) * 100);
    if (!Number.isSafeInteger(result)) throw new Error("Enter a smaller dollar amount.");
    return result;
  };
  const le = cents(row.leAmount);
  const cd = cents(row.cdAmount);
  const reduction = entire ? 0 : cents(amount || "0");
  if (reduction > Math.min(le, cd)) throw new Error("The waiver cannot exceed either the LE or CD amount.");
  return {
    ...row,
    leAmount: ((entire ? 0 : le - reduction) / 100).toFixed(2),
    cdAmount: ((entire ? 0 : cd - reduction) / 100).toFixed(2),
    waived: entire || reduction > 0,
    waiver: { amount: (reduction / 100).toFixed(2), entire, leBase: row.leAmount, cdBase: row.cdAmount },
  };
}
