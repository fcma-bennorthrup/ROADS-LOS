import { expect, it } from "vitest";
import { newLoanApplication, BLANK_LOAN_TEMPLATE } from "./loan-factory";
import { assertLoanDocument } from "./loan-contract";

it.each([1, 2] as const)("preserves the internal blank shell for caller count %i", borrowerCount => {
  const app = newLoanApplication({ id: "blank-test", loanNumber: "123456790", source: "blank",
    borrowerCount, generation: 4, revision: 8, now: "2026-11-11T12:00:00.000Z" });
  expect(app.loan).toEqual({ ...BLANK_LOAN_TEMPLATE, id: "blank-test", loanNumber: "123456790" });
  expect(app.borrowers).toHaveLength(2);
  expect(app.borrowers.every(row => row.name === "" && row.loanId === "blank-test")).toBe(true);
  expect(app.sections).toEqual({});
  expect(app.mode).toBe("empty");
  expect([app.generation, app.revision]).toEqual([4, 8]);
  expect(app.meta).toEqual({ source: "blank", createdAt: "2026-11-11T12:00:00.000Z", updatedAt: "2026-11-11T12:00:00.000Z" });
  assertLoanDocument(app);
});
it("does not share mutable data between blank shells", () => {
  const a = newLoanApplication({ id: "a", loanNumber: "123456790", source: "blank", borrowerCount: 2 });
  const b = newLoanApplication({ id: "b", loanNumber: "123456791", source: "blank", borrowerCount: 2 });
  a.sections.foo = "a";
  a.borrowers[0].name = "Changed";
  expect(b.sections).toEqual({});
  expect(b.borrowers[0].name).toBe("");
});
