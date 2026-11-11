import { expect, it } from "vitest";
import { newSfOpportunity } from "../../server/sf-opportunity";
import { newLoanApplication } from "../loan-factory";
import { assertLoanDocument } from "../loan-contract";
import { resetToBaseline } from "./baseline";

it("restores an edited, imported, credit-pulled loan and clears task outputs", () => {
  const original = newSfOpportunity("baseline-reset-test", "123456790", "123456", new Date("2026-11-11T12:00:00Z"), 2);
  original.meta!.creationAttempt = { key: "test-receipt", source: "sf", borrowerCount: 2 };
  const current = newLoanApplication({
    id: original.loan.id, loanNumber: original.loan.loanNumber, source: "blank", borrowerCount: 1,
    generation: 5, revision: 12,
  });
  current.mode = "blend";
  current.meta = structuredClone(original.meta);
  current.sections["borrower-primary"] = { firstName: "Edited" };
  current.sections["credit-pulled"] = true;
  current.sections["credit-scores"] = { "baseline-reset-test-primary": 740 };
  current.sections["current-liabilities"] = [{ id: "credit-test", borrowerId: "baseline-reset-test-primary" }];
  current.sections["storage:loan-checklist-statuses:baseline-reset-test"] = JSON.stringify({
    estimate: ["completed", "in-progress"], decision: ["completed"], rateLockVersion: 4,
  });
  current.sections["storage:generated-document"] = "completed";
  current.changeLog = [{ id: 1, field: "Name", previousValue: "Old", newValue: "Edited", changedBy: "Demo",
    position: "", timestamp: "", section: "", navItem: "" }];
  const before = structuredClone(current);
  const reset = resetToBaseline(current);
  assertLoanDocument(reset);
  expect(current).toEqual(before);
  expect(reset.loan).toEqual(original.loan);
  expect(reset.borrowers).toEqual(original.borrowers);
  expect(reset.meta!.opportunity).toEqual(original.meta!.opportunity);
  expect(reset.meta!.baseline).toEqual(original.meta!.baseline);
  expect(reset.meta!.createdAt).toBe(original.meta!.createdAt);
  expect(reset.meta!.creationAttempt).toEqual(original.meta!.creationAttempt);
  expect(reset.meta!.source).toBe("sf");
  expect(reset.mode).toBe("empty");
  expect([reset.generation, reset.revision]).toEqual([6, 13]);
  expect(reset.changeLog).toEqual([]);
  expect(reset.sections["credit-pulled"]).toBeUndefined();
  expect(reset.sections["credit-scores"]).toBeUndefined();
  expect(reset.sections["current-liabilities"]).toBeUndefined();
  expect(reset.sections["storage:generated-document"]).toBeUndefined();
  expect(JSON.parse(String(reset.sections["storage:loan-checklist-statuses:baseline-reset-test"])))
    .toEqual({ estimate: ["not-started", "not-started"], decision: ["not-started"] });
  expect(reset.sections.fees).toEqual([expect.objectContaining({ fee: "Origination Fee" })]);
  expect(reset.businessRules!.trid.status).toBe("not-triggered");
  expect(reset.businessRules!.ecoa.status).toBe("not-triggered");
  reset.borrowers[0].name = "Later edit";
  (reset.sections["borrower-primary"] as Record<string, unknown>).firstName = "Later edit";
  expect(reset.meta!.baseline).toEqual(original.meta!.baseline);
});

it("requires a baseline instead of silently emptying a loan", () => {
  const app = newLoanApplication({ id: "no-baseline-reset-test", loanNumber: "123456791", source: "blank", borrowerCount: 1 });
  expect(() => resetToBaseline(app)).toThrow("baseline");
});
