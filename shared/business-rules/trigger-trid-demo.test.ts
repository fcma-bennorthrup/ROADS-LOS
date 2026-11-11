import { describe, expect, it } from "vitest";
import { triggerTridDemo } from "./trigger-trid-demo";
import { tridDemoSections } from "../loan-events/trid-templates";
import type { LoanApplication } from "../loan-application";

function empty(): LoanApplication {
  return { loan: { id: "demo" } as LoanApplication["loan"], borrowers: [],
    sections: {}, mode: "empty", revision: 2, generation: 1, changeLog: [] };
}
describe("Trigger TRID demo action", () => {
  it("saves all six inputs and triggers through the normal rule", () => {
    const current = empty();
    const next = triggerTridDemo(current, tridDemoSections("demo"));
    expect(next.businessRules?.trid.status).toBe("required");
    expect(next.businessRules?.trid.missing).toEqual([]);
    expect(next.generation).toBe(1);
    expect(next.revision).toBe(3);
    expect(next.changeLog).toEqual([]);
    expect((next.sections.income as any[])[0].incomeSources).toHaveLength(1);
    expect(current.sections).toEqual({});
  });
  it("preserves valid values, unrelated data and history, and is repeatable", () => {
    const current = empty();
    current.sections = {
      "borrower-primary": { firstName: "Alex", lastName: "Demo", email: "demo@example.com" },
      "loan-details": { requestedLoanAmount: "250000", tellTheStory: "Keep this" },
      fees: [{ id: "fee-1", amount: 25 }],
    };
    const next = triggerTridDemo(current, tridDemoSections("demo"));
    expect(next.sections["borrower-primary"]).toMatchObject({ firstName: "Alex", lastName: "Demo", email: "demo@example.com" });
    expect(next.sections["loan-details"]).toMatchObject(current.sections["loan-details"] as object);
    expect(next.sections.fees).toEqual(current.sections.fees);
    const again = triggerTridDemo(next, tridDemoSections("demo"));
    expect(again.sections).toEqual(next.sections);
    expect(again.businessRules?.trid.triggeredAt).toBe(next.businessRules?.trid.triggeredAt);
  });
});
