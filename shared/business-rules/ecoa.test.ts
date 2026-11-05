import { describe, expect, it } from "vitest";
import type { LoanApplication } from "../loan-application";
import { evaluateLoanRules } from "./index";

const now = "2026-11-05T12:00:00.000Z";
function fixture(mode: LoanApplication["mode"] = "blend"): LoanApplication {
  return { loan: { id: "ecoa-test" } as LoanApplication["loan"], borrowers: [],
    mode, generation: 1, revision: 1, sections: {} };
}
function progress(app: LoanApplication, decision: string, generated: string, delivered: string) {
  app.sections["storage:loan-checklist-statuses:ecoa-test"] = JSON.stringify({
    "Loan Decision": [decision], "Decision Letter": [generated, delivered],
  });
}
describe("ECOA rule", () => {
  it("starts on Blend import only, including previously imported loans", () => {
    expect(evaluateLoanRules(fixture(), now).ecoa).toMatchObject({ status: "required", triggeredAt: now });
    for (const mode of ["empty", "existing"] as const)
      expect(evaluateLoanRules(fixture(mode), now).ecoa.status).toBe("not-triggered");
  });
  it("requires all three saved actions, not just a decision or generation", () => {
    for (let missing = 0; missing < 3; missing++) {
      const app = fixture();
      const statuses = ["complete", "complete", "complete"];
      statuses[missing] = "not-started";
      progress(app, ...statuses as [string, string, string]);
      expect(evaluateLoanRules(app, now).ecoa.status).toBe("required");
    }
    const app = fixture();
    app.businessRules = evaluateLoanRules(app, now);
    progress(app, "complete", "complete", "complete");
    app.businessRules = evaluateLoanRules(app, now);
    expect(app.businessRules.ecoa.status).toBe("satisfied");
    expect(evaluateLoanRules(app, "2026-11-06T12:00:00.000Z").ecoa).toEqual(app.businessRules.ecoa);
  });
  it("ignores other loans and invalid progress; reset and re-import start fresh", () => {
    const app = fixture();
    app.sections["storage:loan-checklist-statuses:other"] = JSON.stringify({ "Loan Decision": ["complete"], "Decision Letter": ["complete", "complete"] });
    expect(evaluateLoanRules(app, now).ecoa.status).toBe("required");
    app.sections["storage:loan-checklist-statuses:ecoa-test"] = "bad json";
    expect(evaluateLoanRules(app, now).ecoa.status).toBe("required");
    expect(evaluateLoanRules(fixture("empty"), now).ecoa.triggeredAt).toBeNull();
    expect(evaluateLoanRules(fixture(), now).ecoa.status).toBe("required");
  });
});
