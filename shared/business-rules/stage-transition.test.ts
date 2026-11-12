import { expect, it } from "vitest";
import { newSfOpportunity } from "../../server/sf-opportunity";
import { stageAfterSavedProgress } from "./stage-transition";

const requirements: [string, number][] = [
  ["Loan Decision", 0], ["Title Work", 0], ["Appraisal Evaluation", 0],
  ["Early Disclosures", 0], ["Early Disclosures", 1],
  ["Loan Estimate", 0], ["Loan Estimate", 1],
  ["Decision Letter", 0], ["Decision Letter", 1],
];
function ready() {
  const app = newSfOpportunity("stage-rule", "123456790", "123456");
  app.loan.stage = "Decisioning";
  app.sections["loan-details"] = { intentToProceed: true };
  const checklist: Record<string, string[]> = {};
  requirements.forEach(([task, index]) => (checklist[task] ??= [])[index] = "complete");
  app.sections[`storage:loan-checklist-statuses:${app.loan.id}`] = JSON.stringify(checklist);
  return app;
}
it("advances only after every saved prerequisite is complete", () => {
  expect(stageAfterSavedProgress(ready())).toBe("Loan Finalization");
});
it.each(requirements)("waits for %s action %i", (task, index) => {
  const app = ready();
  const key = `storage:loan-checklist-statuses:${app.loan.id}`;
  const checklist = JSON.parse(app.sections[key] as string);
  checklist[task][index] = "in-progress";
  app.sections[key] = JSON.stringify(checklist);
  expect(stageAfterSavedProgress(app)).toBe("Decisioning");
});
it("requires saved intent, valid progress, and the correct loan", () => {
  const app = ready();
  app.sections["loan-details"] = { intentToProceed: false };
  expect(stageAfterSavedProgress(app)).toBe("Decisioning");
  app.sections["loan-details"] = { intentToProceed: true };
  const key = `storage:loan-checklist-statuses:${app.loan.id}`;
  app.sections["storage:loan-checklist-statuses:other"] = app.sections[key];
  app.sections[key] = "invalid";
  expect(stageAfterSavedProgress(app)).toBe("Decisioning");
});
it.each(["Customer Application", "Closing", "Loan Finalization"] as const)("preserves %s", stage => {
  const app = ready(); app.loan.stage = stage;
  expect(stageAfterSavedProgress(app)).toBe(stage);
});

function closingReady() {
  const app = ready();
  app.loan.stage = "Loan Finalization";
  app.sections[`storage:loan-checklist-statuses:${app.loan.id}`] = JSON.stringify({
    "Title Work": ["complete", "complete", "complete"],
    "Appraisal Evaluation": ["complete", "complete", "complete"],
    "Rate Lock": ["complete", "not-started", "not-started"],
  });
  app.sections[`storage:loan-closing-disclosures:${app.loan.id}`] = JSON.stringify({
    records: [{ id: 1, generatedAt: "2026-11-12T12:00:00Z", deliveredAt: "2026-11-12T13:00:00Z" }], resetToken: null,
  });
  return app;
}
it("advances finalization after completed evaluation/title, delivered CD and locked rate", () => {
  expect(stageAfterSavedProgress(closingReady())).toBe("Closing");
});
it.each([
  ["Title Work", 0], ["Title Work", 1], ["Title Work", 2],
  ["Appraisal Evaluation", 0], ["Appraisal Evaluation", 1], ["Appraisal Evaluation", 2],
  ["Rate Lock", 0],
] as const)("requires %s action %i before Closing", (task, index) => {
  const app = closingReady(), key = `storage:loan-checklist-statuses:${app.loan.id}`;
  const progress = JSON.parse(app.sections[key] as string);
  progress[task][index] = "in-progress";
  app.sections[key] = JSON.stringify(progress);
  expect(stageAfterSavedProgress(app)).toBe("Loan Finalization");
});
it.each(["{}", "invalid", JSON.stringify({ records: [{ generatedAt: "2026-11-12T12:00:00Z", deliveredAt: null }] })])(
  "does not advance without valid generated and delivered CD history: %s", history => {
    const app = closingReady();
    app.sections[`storage:loan-closing-disclosures:${app.loan.id}`] = history;
    expect(stageAfterSavedProgress(app)).toBe("Loan Finalization");
  },
);
