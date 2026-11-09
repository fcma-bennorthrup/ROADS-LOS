import { describe, expect, it } from "vitest";
import { populateDemoCredit } from "./demo-credit";
import type { LoanApplication } from "./loan-application";

function application(count: number) {
  return { loan: { id: "demo" }, borrowers: Array.from({ length: count }, (_, i) => ({
    id: `borrower-${i}`, name: `Borrower ${i + 1}`,
  })), sections: { "current-liabilities": [{ id: "manual-entry" }] },
  generation: 2, revision: 3 } as unknown as LoanApplication;
}
describe("demo credit liabilities", () => {
  it.each([1, 2])("adds four accounts per borrower for %i borrowers", count => {
    const current = application(count);
    const result = populateDemoCredit(current);
    expect(result.sections["current-liabilities"]).toHaveLength(1 + count * 2);
    expect(result.sections["noncurrent-liabilities"]).toHaveLength(count * 2);
    expect(result.sections["current-liabilities"]).toContainEqual({ id: "manual-entry" });
    for (const borrower of current.borrowers) {
      expect((result.sections["noncurrent-liabilities"] as { borrowerId: string }[])
        .filter(row => row.borrowerId === borrower.id)).toHaveLength(2);
    }
    expect(result.sections["credit-pulled"]).toBe(true);
    expect(result.businessRules?.loanDecision.ready).toBe(true);
    expect(result.revision).toBe(4);
    expect(current.sections["credit-pulled"]).toBeUndefined();
    expect(populateDemoCredit(result)).toBe(result);
  });
  it("uses edited borrower names and rejects an empty application", () => {
    const current = application(1);
    current.sections["borrower-primary"] = { firstName: "Updated", lastName: "Applicant" };
    expect(populateDemoCredit(current).sections["current-liabilities"]).toEqual(
      expect.arrayContaining([expect.objectContaining({ borrowerName: "Updated Applicant" })]));
    current.sections["borrower-primary"] = { firstName: "", lastName: "" };
    expect(() => populateDemoCredit(current)).toThrow("Add borrower information");
  });
});
