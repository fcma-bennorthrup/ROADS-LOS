import { describe, expect, it } from "vitest";
import { EMPTY_CIRCUMSTANCES, feeCircumstancesSchema, pendingAppraisalChanges, trackAppraisalEdits } from "./fee-circumstances";
import type { FeeRow } from "./fees";
const appraisal: FeeRow = { id: "a", fee: "Appraisal Fee", leAmount: "500", cdAmount: "500", methodOfPayment: "Cash", paidBy: "Buyer" };
describe("Appraisal change tracking", () => {
  it("does not treat initial fee addition or unrelated edits as an appraisal change", () => {
    expect(trackAppraisalEdits(EMPTY_CIRCUMSTANCES, [], [appraisal]).pending).toEqual([]);
    expect(trackAppraisalEdits(EMPTY_CIRCUMSTANCES, [{ ...appraisal, fee: "Credit Report Fee" }], [{ ...appraisal, fee: "Credit Report Fee", paidTo: "New" }]).pending).toEqual([]);
  });
  it("retains the original baseline over repeated edits and ignores reverts", () => {
    const changed = { ...appraisal, paidTo: "New appraiser" };
    const state = trackAppraisalEdits(EMPTY_CIRCUMSTANCES, [appraisal], [changed]);
    const twice = trackAppraisalEdits(state, [changed], [{ ...changed, leAmount: "750" }]);
    expect(twice.pending).toEqual([appraisal]);
    expect(pendingAppraisalChanges(twice, [appraisal])).toEqual([]);
    expect(pendingAppraisalChanges(twice, [changed])).toHaveLength(1);
  });
  it("tracks deletion and renaming of an existing appraisal", () => {
    const state = trackAppraisalEdits(EMPTY_CIRCUMSTANCES, [appraisal], []);
    expect(pendingAppraisalChanges(state, [])[0].after).toBeNull();
    expect(trackAppraisalEdits(EMPTY_CIRCUMSTANCES, [appraisal], [{ ...appraisal, fee: "Other" }]).pending).toEqual([appraisal]);
  });
  it("validates saved reasons and requires context", () => {
    const record = { id: "1", savedAt: "2026-11-11T12:00:00.000Z", reason: "not-valid", context: "Correction", changes: [] };
    expect(feeCircumstancesSchema.safeParse({ pending: [], records: [record] }).success).toBe(true);
    expect(feeCircumstancesSchema.safeParse({ pending: [], records: [{ ...record, context: " " }] }).success).toBe(false);
    const legacy = feeCircumstancesSchema.parse({ pending: [], records: [{
      ...record, changes: [{ before: { ...appraisal, leAmount: 500, cdAmount: 500 }, after: appraisal }],
    }] });
    expect(legacy.records[0].changes[0].before.leAmount).toBe("500");
  });
});
