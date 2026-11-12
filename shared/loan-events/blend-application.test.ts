import { expect, it } from "vitest";
import { newSfOpportunity } from "../../server/sf-opportunity";
import { applyBlendApplication } from "./blend-application";
import { deterministicRandom } from "./random";
import { assertLoanDocument } from "../loan-contract";
const now = new Date("2026-11-11T12:00:00Z");
const apply = (app: ReturnType<typeof newSfOpportunity>, borrowerCount: 1 | 2, seed = 1) =>
  applyBlendApplication(app, { borrowerCount, now, random: deterministicRandom(seed) });

it.each([1, 2] as const)("fills %i borrowers without replacing Salesforce or workflow data", count => {
  const app = newSfOpportunity("blend-test", "123456790", "123456", now, count);
  app.sections["storage:checklist"] = "saved";
  app.sections["credit-pulled"] = true;
  app.sections["credit-scores"] = { "blend-test-primary": 720 };
  const before = structuredClone(app);
  const result = apply(app, count);
  assertLoanDocument(result);
  expect(app).toEqual(before);
  expect(result.loan).toEqual({ ...app.loan, stage: "Decisioning" });
  expect(result.meta).toEqual(app.meta);
  expect(result.borrowers).toEqual(app.borrowers);
  expect(result.generation).toBe(app.generation);
  expect(result.revision).toBe(app.revision + 1);
  expect(result.changeLog).toEqual(app.changeLog);
  expect(result.sections["storage:checklist"]).toBe("saved");
  expect(result.sections["credit-pulled"]).toBe(true);
  expect(result.sections["credit-scores"]).toEqual(app.sections["credit-scores"]);
  expect(result.sections["current-liabilities"]).toEqual([]);
  expect(result.sections.income).toHaveLength(count);
  expect(result.businessRules!.primaryWageEarner.monthlyIncomes.every(value => value !== null)).toBe(true);
  expect(result.businessRules!.trid.status).toBe("not-triggered");
  expect(result.businessRules!.ecoa.status).toBe("required");
  expect(apply(result, count, 9)).toBe(result);
  expect(apply(app, count, 2).sections).not.toEqual(result.sections);
});
it.each(["Decisioning", "Pre-Approval", "Loan Setup", "Closing", "Booking"] as const)(
  "does not change stage %s during a Blend import", stage => {
    const app = newSfOpportunity("stage-test", "123456790", "123456", now);
    app.loan.stage = stage;
    expect(apply(app, 1).loan.stage).toBe(stage);
  },
);
it("advances a fully populated Customer Application only when importing again", () => {
  const app = apply(newSfOpportunity("stage-test", "123456790", "123456", now), 1);
  app.loan.stage = "Customer Application";
  const next = apply(app, 1);
  expect(next.loan.stage).toBe("Decisioning");
  expect(next.sections).toEqual(app.sections);
  expect(next.revision).toBe(app.revision + 1);
  expect(app.loan.stage).toBe("Customer Application");
});
it("preserves hand entry, coupled fields and uncovered borrowers", () => {
  const app = newSfOpportunity("blend-test", "123456790", "123456", now, 2);
  const first = app.sections["borrower-primary"] as Record<string, unknown>;
  first.maritalStatus = "separated";
  first.city = ""; first.dependents = "2"; first.dependentsAges = "4, 7";
  const result = apply(app, 1);
  expect(result.sections["borrower-secondary"]).toEqual(app.sections["borrower-secondary"]);
  expect(result.sections["borrower-primary"]).toMatchObject({ maritalStatus: "separated", city: "", dependents: "2", dependentsAges: "4, 7" });
  (result.sections["borrower-primary"] as Record<string, unknown>).maritalStatus = "";
  expect((apply(result, 1).sections["borrower-primary"] as any).maritalStatus).toBe("married");
});
it("adds a co-borrower without changing the first and preserves liabilities", () => {
  const app = newSfOpportunity("blend-test", "123456790", "123456", now);
  app.sections["current-liabilities"] = [{ id: "existing", borrowerId: app.borrowers[0].id }];
  const result = apply(app, 2);
  assertLoanDocument(result);
  expect(result.borrowers).toHaveLength(2);
  expect(result.businessRules!.jointCredit.showChip).toBe(true);
  expect(result.sections["current-liabilities"]).toEqual(app.sections["current-liabilities"]);
  expect(apply(result, 2)).toBe(result);
});
