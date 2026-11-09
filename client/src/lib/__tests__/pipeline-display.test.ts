import { describe, expect, it } from "vitest";
import type { PipelineLoan } from "@shared/pipeline";
import { pipelineRows, relativeUpdated, queueLoans, pipelinePage, type PipelineSort } from "../pipeline-display";
import { applicationStore } from "../loan-application-store";
import { blendDemoSections } from "../blend-demo-fixture";
import type { LoanApplication } from "@shared/loan-application";

const row = (id: string, extra: Partial<PipelineLoan>): PipelineLoan => ({
  id, loanNumber: id, primaryBorrowerName: "", loanType: "", stage: "Customer Application",
  amountRequested: null, product: null, mode: "empty", revision: 0,
  createdAt: "2026-11-09T12:00:00Z", updatedAt: "2026-11-09T12:00:00Z", ...extra,
});
const loans = [
  row("2", { primaryBorrowerName: "Zara Miles", loanType: "Purchase", stage: "Closing", amountRequested: 98200, product: "Variable", updatedAt: "2026-11-09T13:00:00Z" }),
  row("10", { primaryBorrowerName: "Alex Burns", loanType: "Construction", stage: "Loan Setup", amountRequested: 145500, product: "Fixed" }),
];
describe("pipeline projection controls", () => {
  it("keeps department queues empty until an explicit assignment resolver is supplied", () => {
    expect(queueLoans(loans, "All Loans")).toEqual(loans);
    expect(queueLoans(loans, "Credit")).toEqual([]);
    expect(queueLoans(loans, "Credit", loan => loan.id === "2" ? "Credit" : "Operations")).toEqual([loans[0]]);
  });
  it("clamps pagination after data changes and handles zero records", () => {
    expect(pipelinePage(loans, 8, 1)).toEqual({ page: 2, pageCount: 2, rows: [loans[1]] });
    expect(pipelinePage([], 8, 20)).toEqual({ page: 1, pageCount: 1, rows: [] });
  });
  it("searches only borrower/loan number and combines multiselect stages", () => {
    expect(pipelineRows(loans, "MILES", ["Closing", "Booking"], "updatedAt", "desc").map(row => row.id)).toEqual(["2"]);
    expect(pipelineRows(loans, "Purchase", [], "updatedAt", "desc")).toEqual([]);
    expect(pipelineRows(loans, "10", ["Closing"], "updatedAt", "desc")).toEqual([]);
  });
  it.each<PipelineSort>(["loanNumber", "primaryBorrowerName", "loanType", "stage", "amountRequested", "product", "updatedAt"])("sorts %s in both directions without mutating query data", column => {
    const asc = pipelineRows(loans, "", [], column, "asc").map(row => row.id);
    const desc = pipelineRows(loans, "", [], column, "desc").map(row => row.id);
    expect(desc).toEqual([...asc].reverse());
    expect(loans.map(row => row.id)).toEqual(["2", "10"]);
  });
  it("uses numeric amount and stage order rather than alphabetical sorting", () => {
    expect(pipelineRows(loans, "", [], "stage", "asc")[0].stage).toBe("Loan Setup");
    expect(pipelineRows(loans, "", [], "amountRequested", "desc")[0].amountRequested).toBe(145500);
  });
  it("keeps unavailable amounts last", () => {
    for (const direction of ["asc", "desc"] as const) {
      expect(pipelineRows([...loans, row("3", {})], "", [], "amountRequested", direction).at(-1)?.id).toBe("3");
    }
  });
  it("formats relative activity and handles invalid timestamps", () => {
    expect(relativeUpdated("2026-11-09T12:00:00Z", Date.parse("2026-11-09T12:02:00Z"))).toBe("2 min ago");
    expect(relativeUpdated("invalid")).toBe("—");
  });
});
it("new blank forms have no stale fields and Blend keeps no liabilities and loan-specific ownership", () => {
  applicationStore.install({ loan: { id: "new-blank" }, mode: "empty", sections: {}, borrowers: [], generation: 0, revision: 0 } as unknown as LoanApplication);
  expect(applicationStore.read("borrower-primary", { firstName: "Richard", lastName: "Jamerson" })).toEqual({ firstName: "", lastName: "" });
  expect(applicationStore.read("fees", [{ amount: "200" }])).toEqual([]);
  const blend = blendDemoSections("new-blend", 1);
  expect(blend["current-liabilities"]).toEqual([]);
  expect(blend["noncurrent-liabilities"]).toEqual([]);
  expect(blend["borrower-secondary"]).toBeUndefined();
  expect(blend["subject-property"]).toMatchObject({ collateralOwnerId: "new-blend-primary", monthlyPropertyTaxes: "", monthlyInsurance: "" });
  expect(blend["current-assets"]).toEqual(expect.arrayContaining([expect.objectContaining({ borrowerId: "new-blend-primary" })]));
});
