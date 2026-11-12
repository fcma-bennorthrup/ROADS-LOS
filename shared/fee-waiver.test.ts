import { describe, it, expect } from "vitest";
import { applyFeeWaiver, feeRecordSchema, type FeeRow } from "./fees";
import { changesForSave } from "./loan-history";

const fee: FeeRow = { id: "fee", fee: "Credit Report Fee", leAmount: "100.00", cdAmount: "150.00", methodOfPayment: "Cash", paidBy: "Buyer" };
describe("fee waivers", () => {
  it("stores net amounts and preserves gross amounts through the shared schema", () => {
    const next = applyFeeWaiver(fee, "25.50", false);
    expect(next).toMatchObject({ leAmount: "74.50", cdAmount: "124.50", waived: true,
      waiver: { amount: "25.50", entire: false, leBase: "100.00", cdBase: "150.00" } });
    expect(feeRecordSchema.parse(next)).toEqual(next);
    const history = changesForSave("fees", [fee], [next], 2);
    expect(history).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "Fees / Row 1 / Le Amount", previousValue: "100.00", newValue: "74.50" }),
      expect.objectContaining({ field: "Fees / Row 1 / Cd Amount", previousValue: "150.00", newValue: "124.50" }),
    ]));
  });
  it("fully waives unequal amounts and can restore them", () => {
    const next = applyFeeWaiver(fee, "", true);
    expect(next).toMatchObject({ leAmount: "0.00", cdAmount: "0.00", waived: true });
    expect(applyFeeWaiver({ ...next, leAmount: next.waiver!.leBase, cdAmount: next.waiver!.cdBase }, "", false))
      .toMatchObject({ leAmount: "100.00", cdAmount: "150.00", waived: false });
  });
  it.each(["-1", "101", "1.001", "abc", "Infinity"])("rejects invalid waiver %s", value => {
    expect(() => applyFeeWaiver(fee, value, false)).toThrow();
  });
});
