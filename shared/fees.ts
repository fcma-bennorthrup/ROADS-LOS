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
}

/** Preserve legacy fee fields without normalizing amounts or payment choices.
 * New optional fields are validated without requiring a backfill of old loans. */
export const feeRecordSchema = z.object({
  paidTo: z.string().optional(),
  shoppedForProvider: z.boolean().optional(),
  waived: z.boolean().optional(),
}).passthrough();
