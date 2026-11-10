import { describe, expect, it } from "vitest";
import { feeRecordSchema } from "./fees";
import { loanApplicationSchema } from "./loan-contract";
import { newLoanApplication } from "./loan-factory";

describe("persisted fee fields", () => {
  it("preserves legacy rows without inventing a payee or provider choice", () => {
    const legacy = { id: "fee", fee: "Title Insurance Fee", leAmount: "12.00", cdAmount: "13.00",
      methodOfPayment: "Cash", paidBy: "Buyer", existingExtra: "keep" };
    expect(feeRecordSchema.parse(legacy)).toEqual(legacy);
  });
  it.each(["Financed", "Cash"])("keeps %s and all new values in the shared loan contract", methodOfPayment => {
    const doc = newLoanApplication({ id: "test", loanNumber: "123456790", source: "blank", borrowerCount: 1 });
    const fees = [{ id: "fee", fee: "Appraisal Fee", leAmount: "450", cdAmount: "475",
      methodOfPayment, paidBy: "Seller", paidTo: "Appraisal provider", shoppedForProvider: true }];
    doc.sections.fees = fees;
    expect(loanApplicationSchema.parse(doc).sections.fees).toEqual(fees);
  });
  it("validates new fields, including explicit blank and unchecked values", () => {
    expect(feeRecordSchema.safeParse({ paidTo: "", shoppedForProvider: false }).success).toBe(true);
    expect(feeRecordSchema.safeParse({ paidTo: 5 }).success).toBe(false);
    expect(feeRecordSchema.safeParse({ shoppedForProvider: "yes" }).success).toBe(false);
  });
});
