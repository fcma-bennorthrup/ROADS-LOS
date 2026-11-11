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
    const borrower = saved.sections["borrower-primary"];
    expect(`${borrower.firstName} ${borrower.lastName}`).toBe(row.primaryBorrowerName);
    expect(borrower.ssn).toMatch(/^000-\d{2}-\d{4}$/);
    expect(borrower.dob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(borrower.dob).toISOString().slice(0, 10)).toBe(borrower.dob);
    expect(borrower.phone).toMatch(/^\(\d{3}\) 555-01\d{2}$/);
    expect(borrower.email).toBe(`${borrower.firstName.toLowerCase()}.${borrower.lastName.toLowerCase()}.${row.cifNumber}@example.com`);
    expect(borrower.address).toMatch(/^\d{3} Example Lane$/);
    expect(["Louisville|KY|40202", "Indianapolis|IN|46204", "Columbus|OH|43215"])
      .toContain(`${borrower.city}|${borrower.state}|${borrower.zip}`);
    expect(applicationView(saved).borrowers[0]).toMatchObject({ name: row.primaryBorrowerName, phone: borrower.phone, email: borrower.email });
    expect(saved.sections["borrower-primary"]).toEqual(app.sections["borrower-primary"]);
    expect(app.businessRules?.trid.status).toBe("not-triggered");
  }
});
it.each([1, 2] as const)("captures an independent baseline and income records for %i borrowers", borrowerCount => {
  const now = new Date("2026-11-11T15:00:00Z");
  const app = newSfOpportunity("sf-baseline-test", "123456790", "123456", now, borrowerCount);
  assertLoanDocument(app);
  expect(app.borrowers).toHaveLength(borrowerCount);
  expect(app.sections.income).toEqual(app.borrowers.map(({ name }) => ({
    name, isPrimaryWageEarner: false, incomeSources: [],
  })));
  expect(applicationView(app).borrowers).toHaveLength(borrowerCount);
  expect(pipelineView(app).additionalBorrowerCount).toBe(borrowerCount - 1);
  expect(app.meta!.baseline).toEqual({
    capturedAt: now.toISOString(), loan: app.loan, borrowers: app.borrowers,
    sections: app.sections, opportunity: app.meta!.opportunity,
  });
  if (borrowerCount === 2) {
    const first = app.sections["borrower-primary"] as Record<string, string>;
    const second = app.sections["borrower-secondary"] as Record<string, string>;
    for (const key of ["ssn", "phone", "email"]) expect(first[key]).not.toBe(second[key]);
    expect(app.borrowers[0].name).not.toBe(app.borrowers[1].name);
    expect(app.borrowers[1]).toMatchObject({ id: "sf-baseline-test-secondary", loanId: app.loan.id, isPrimary: false });
    expect(applicationView(app).borrowers[1].name).toBe(app.borrowers[1].name);
  }
  const baseline = structuredClone(app.meta!.baseline);
  app.loan.primaryBorrowerName = "Edited";
  app.borrowers[0].name = "Edited";
  (app.sections["borrower-primary"] as Record<string, string>).firstName = "Edited";
  app.meta!.opportunity!.region = "Edited";
  expect(app.meta!.baseline).toEqual(baseline);
});
it("keeps known legacy fields and opportunity details while filling blanks", () => {
  const now = new Date("2026-11-11T15:00:00Z");
  const primary = { firstName: "Avery", lastName: "Legacy", ssn: "000-34-5678", phone: "(502) 555-0198",
    email: "avery.legacy@example.com", dob: "1980-01-02", address: "234 Example Lane", city: "Louisville", state: "KY", zip: "40202" };
  const opportunity = { region: "504", loanOfficer: "Demo Officer", applicationDate: "2026-01-01",
    queue: "Sales Support" as const, decision: "", contractExpiryDate: "2026-04-01" };
  const app = newSfOpportunity("known-reset-test", "123456790", "654321", now, 2, {
    primary, secondary: { firstName: "Jordan", lastName: "Legacy", ssn: "", phone: " " },
    loanDetails: { loanType: "refinance", requestedLoanAmount: "87000", loanPurpose: "must not retain" },
    opportunity,
  });
  assertLoanDocument(app);
  expect(app.sections["borrower-primary"]).toMatchObject(primary);
  expect(app.sections["borrower-secondary"]).toMatchObject({ firstName: "Jordan", lastName: "Legacy" });
  expect(app.sections["loan-details"]).toMatchObject({ loanType: "refinance", requestedLoanAmount: "87000", loanPurpose: "" });
  expect(app.loan).toMatchObject({ cifNumber: "654321", loanType: "Refinance", amountRequested: "87000" });
  expect(app.meta!.opportunity).toEqual(opportunity);
});
it("does not loop when legacy applicants share names and need email addresses", () => {
  const identity = { firstName: "Avery", lastName: "Legacy" };
  const app = newSfOpportunity("same-name-reset-test", "123456790", "654321", new Date(), 2,
    { primary: identity, secondary: identity });
  expect(app.borrowers[0].name).toBe(app.borrowers[1].name);
  expect(app.borrowers[0].email).not.toBe(app.borrowers[1].email);
  assertLoanDocument(app);
});
