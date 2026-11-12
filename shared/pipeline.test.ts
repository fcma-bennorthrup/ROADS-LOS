import { expect, it } from "vitest";
import { newLoanApplication } from "./loan-factory";
import { pipelineView } from "./pipeline";
import { applyTridDemoAction } from "./business-rules/trid-demo-actions";
import { evaluateLoanRules } from "./business-rules";
import { queueLoans } from "../client/src/lib/pipeline-display";

it("projects additive Operations eligibility through trigger, satisfaction and reset", () => {
  const app = newLoanApplication({ id: "operations-test", loanNumber: "123456799", source: "blank", borrowerCount: 1 });
  app.meta!.opportunity = { region: "500", loanOfficer: "Sarah Williams", applicationDate: "2026-11-12",
    contractExpiryDate: "2026-12-12", decision: "", queue: "Sales Support" };
  expect(pipelineView(app).operationsEligible).toBe(false);
  expect(pipelineView(app).closingDate).toBeUndefined();
  app.sections["closing-details"] = { closingDate: "11/25/2026" };
  expect(pipelineView(app).closingDate).toBe("11/25/2026");
  app.sections["closing-details"] = { closingDate: "" };
  expect(pipelineView(app).closingDate).toBe("");
  const triggered = applyTridDemoAction(app, "trid-manual");
  expect(pipelineView(triggered).operationsEligible).toBe(true);
  expect(pipelineView(triggered).tridStatus).toBe("required");
  expect(pipelineView(triggered).tridTriggeredAt).toBe(triggered.businessRules?.trid.triggeredAt);
  triggered.sections[`storage:loan-checklist-statuses:${app.loan.id}`] = JSON.stringify({ "Loan Estimate": ["complete", "complete"] });
  triggered.businessRules = evaluateLoanRules(triggered);
  expect(triggered.businessRules.trid.status).toBe("satisfied");
  const row = pipelineView(triggered);
  for (const queue of ["All Loans", "Sales Support", "Operations"] as const) {
    expect(queueLoans([row], queue)).toEqual([row]);
  }
  triggered.sections.withdrawal = { acknowledged: true };
  expect(pipelineView(triggered).operationsEligible).toBe(true);
  const reset = pipelineView(applyTridDemoAction(triggered, "trid-reset"));
  expect(reset.operationsEligible).toBe(false);
  expect(queueLoans([reset], "Operations")).toEqual([]);
  expect(queueLoans([reset], "Sales Support")).toEqual([reset]);
  expect(queueLoans([reset], "All Loans")).toEqual([reset]);
  expect(app.businessRules?.trid.triggeredAt).toBeFalsy();
});
