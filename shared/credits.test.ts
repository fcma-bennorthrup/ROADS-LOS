import { describe, expect, it } from "vitest";
import { CREDIT_TYPES, creditRecordSchema, normalizeCreditAmount } from "./credits";
import { assertLoanDocument, sectionSchemas } from "./loan-contract";
import { newLoanApplication } from "./loan-factory";
import { changesForSave } from "./loan-history";
import { newSfOpportunity } from "../server/sf-opportunity";
import { applyBlendApplication } from "./loan-events/blend-application";
import { resetToBaseline } from "./loan-events/baseline";
import { deterministicRandom } from "./loan-events/random";

const row = { id: "credit-test", creditType: CREDIT_TYPES[0], cdAmount: "500.00", description: "Promotion" };
describe("loan credits", () => {
  it.each(CREDIT_TYPES)("accepts %s", creditType => {
    expect(creditRecordSchema.safeParse({ ...row, creditType }).success).toBe(true);
  });
  it.each(["-1", "NaN", "Infinity", "1e3", "12junk", "1,2", "1.234"])("rejects %s", amount => {
    expect(normalizeCreditAmount(amount)).toBeNull();
    expect(creditRecordSchema.safeParse({ ...row, cdAmount: amount }).success).toBe(false);
  });
  it("normalizes dollars and accepts zero", () => {
    expect(normalizeCreditAmount("$1,250.5")).toBe("1250.50");
    expect(normalizeCreditAmount("0")).toBe("0.00");
    expect(normalizeCreditAmount("")).toBe("0.00");
  });
  it("validates the section without requiring it on older loans", () => {
    const app = newLoanApplication({ id: "credits", loanNumber: "123456790", source: "blank", borrowerCount: 1 });
    expect(() => assertLoanDocument(app)).not.toThrow();
    app.sections.credits = [row];
    expect(() => assertLoanDocument(app)).not.toThrow();
    expect(sectionSchemas.credits.safeParse([{ ...row, creditType: "Unknown" }]).success).toBe(false);
    expect(sectionSchemas.credits.safeParse([]).success).toBe(true);
  });
  it("preserves credits during Blend and removes later credits on Reset", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    const app = newSfOpportunity("credits-events", "123456790", "123456", now, 1);
    app.sections.credits = [row];
    const imported = applyBlendApplication(app, { now, random: deterministicRandom(45), borrowerCount: 1 });
    expect(imported.sections.credits).toEqual([row]);
    expect(resetToBaseline(imported).sections.credits).toBeUndefined();
  });
  it("records changes and deletions under Credits, not initial values", () => {
    expect(changesForSave("credits", [], [row], 1)).toEqual([]);
    const deleted = changesForSave("credits", [row], [], 2);
    expect(deleted.length).toBeGreaterThan(0);
    expect(deleted.every(change => change.section === "Credits" && change.navItem === "Credits")).toBe(true);
  });
});
