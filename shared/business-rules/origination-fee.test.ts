import { describe, expect, it } from "vitest";
import { newLoanApplication } from "../loan-factory";
import { withOriginationFee } from "./origination-fee";
import type { FeeRow } from "../fees";
import { applyBlendApplication } from "../loan-events/blend-application";
import { deterministicRandom } from "../loan-events/random";

function loan(amount: unknown) {
  const app = newLoanApplication({ id: "test", loanNumber: "test", source: "blank", borrowerCount: 1 });
  app.sections["loan-details"] = { requestedLoanAmount: amount };
  return app;
}
describe("Automatic origination fee", () => {
  it.each([["50000", "500.00"], ["$99,999.99", "1000.00"], ["100000", "1000.00"], ["500000", "1000.00"], ["12345.67", "123.46"]])(
    "sets both amounts for %s to %s", (amount, expected) => {
      const result = withOriginationFee(loan(amount));
      expect(result.sections.fees).toEqual([expect.objectContaining({
        fee: "Origination Fee", leAmount: expected, cdAmount: expected, waived: false,
      })]);
      expect(withOriginationFee(result)).toBe(result);
    });
  it.each(["", "0", "-1", "bad", null])("does not add for absent or invalid amount %s", amount => {
    const app = loan(amount);
    expect(withOriginationFee(app)).toBe(app);
  });
  it("preserves an existing edited or waived origination fee and other fees", () => {
    const app = loan("50000");
    const fees = [{ id: "manual", fee: "Origination Fee", leAmount: "42", cdAmount: "43", waived: true },
      { id: "appraisal", fee: "Appraisal Fee", leAmount: "500", cdAmount: "500" }];
    app.sections.fees = fees;
    expect(withOriginationFee(app).sections.fees).toEqual(fees);
  });
  it("preserves later edits, waivers and deletions even if the loan amount changes", () => {
    const app = withOriginationFee(loan("50000"));
    (app.sections.fees as FeeRow[])[0].leAmount = "75";
    (app.sections.fees as FeeRow[])[0].waived = true;
    app.sections["loan-details"] = { requestedLoanAmount: "90000" };
    expect(withOriginationFee(app)).toBe(app);
    app.sections.fees = [];
    expect(withOriginationFee(app).sections.fees).toEqual([]);
  });
  it("initializes Blend imports", () => {
    const app = applyBlendApplication(loan("45000"), { borrowerCount: 1, random: deterministicRandom(42), now: new Date() });
    expect(app.sections.fees).toEqual([expect.objectContaining({ leAmount: "450.00", cdAmount: "450.00" })]);
  });
});
