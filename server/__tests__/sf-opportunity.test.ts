import { expect, it } from "vitest";
import { allocateCif, newSfOpportunity } from "../sf-opportunity";
import { assertLoanDocument } from "../../shared/loan-contract";
import { pipelineView } from "../../shared/pipeline";
import { applicationView } from "../../shared/loan-application";

it("skips collisions and wraps within six digits", () => {
  expect(allocateCif(new Set(["999999", "100000"]), 999999)).toBe("100001");
  expect(() => allocateCif(new Set(Array.from({ length: 900000 }, (_, i) => String(100000 + i))))).toThrow("No six-digit CIFs");
});
it("persists valid synthetic fields and matching detail projections", () => {
  for (let i = 0; i < 50; i++) {
    const app = newSfOpportunity(`sf-${i}`, "123456790", String(100000 + i), new Date("2026-10-15T02:00:00Z"));
    assertLoanDocument(app);
    const saved = JSON.parse(JSON.stringify(app));
    const row = pipelineView(saved);
    expect(row).toMatchObject({ cifNumber: String(100000 + i), loanType: "Purchase",
      stage: "Customer Application", applicationDate: "2026-10-14", decision: "", departmentQueue: "Sales Support" });
    expect(["500", "502", "504"]).toContain(row.region);
    expect(["Sarah Williams", "Rylee Alcorn", "Connor Welch"]).toContain(row.loanOfficer);
    expect(row.amountRequested).toBeGreaterThan(0);
    expect(row.amountRequested).toBeLessThan(444100);
    expect(row.primaryBorrowerName).toMatch(/^\w+ \w+$/);
    expect(applicationView(saved).primaryBorrowerName).toBe(row.primaryBorrowerName);
    expect(Number(applicationView(saved).amountRequested)).toBe(row.amountRequested);
    expect(pipelineView(saved)).toEqual(pipelineView(app));
  }
});
