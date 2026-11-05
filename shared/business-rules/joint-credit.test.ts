import { describe, expect, it } from "vitest";
import { evaluateLoanRules } from "./index";
import { blendDemoSections } from "../../client/src/lib/blend-demo-fixture";
import { applicationView, type LoanApplication } from "../loan-application";

describe("Blend borrower count and joint credit", () => {
  it.each([1, 2] as const)("imports %i borrowers without leftover secondary data", count => {
    const sections = blendDemoSections("demo", count);
    const app = { loan: { id: "demo", financedFees: "0" }, mode: "blend",
      generation: 1, revision: 1, sections,
      borrowers: Array.from({ length: count }, (_, index) => ({ id: String(index), name: "Applicant" })),
    } as LoanApplication;
    expect(sections["borrower-secondary"] !== undefined).toBe(count === 2);
    expect(sections.income).toHaveLength(count);
    expect(evaluateLoanRules(app).jointCredit).toEqual({ borrowerCount: count, showChip: count === 2 });
    expect(applicationView(app).applicationType).toBe(count === 2 ? "Joint Credit Application" : "");
    expect(applicationView(app).borrowers).toHaveLength(count);
  });
  it("does not count empty reset slots as a joint application", () => {
    const app = { loan: { id: "demo" }, mode: "empty", sections: {},
      borrowers: [{ name: "" }, { name: "" }] } as LoanApplication;
    expect(evaluateLoanRules(app).jointCredit.showChip).toBe(false);
  });
});
