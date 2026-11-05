import { describe, expect, it } from "vitest";
import { changesForSave } from "./loan-history";

describe("saved loan change history", () => {
  it("treats monthly property costs as Collateral fields with normal baseline and edit history", () => {
    const blank = { monthlyPropertyTaxes: "", monthlyInsurance: "" };
    const saved = { monthlyPropertyTaxes: "125.50", monthlyInsurance: "0" };
    expect(changesForSave("subject-property", blank, saved, 1)).toEqual([]);
    const rows = changesForSave("subject-property", saved,
      { monthlyPropertyTaxes: "150", monthlyInsurance: "" }, 2);
    expect(rows).toMatchObject([
      { field: "Subject Property / Monthly Property Taxes", section: "Collateral", previousValue: "125.50", newValue: "150" },
      { field: "Subject Property / Monthly Insurance", section: "Collateral", previousValue: "0", newValue: "—" },
    ]);
  });
  it("does not record initialization or blank fields receiving their first value", () => {
    expect(changesForSave("loan-details", undefined, { amount: "100" }, 1)).toEqual([]);
    expect(changesForSave("loan-details", { amount: "" }, { amount: "100" }, 1)).toEqual([]);
  });
  it("records edits and clearing values with server timestamp", () => {
    const rows = changesForSave("borrower-primary",
      { firstName: "Alex", email: "demo@example.com" },
      { firstName: "Sam", email: "" }, 2, "2026-11-04T12:00:00.000Z");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ previousValue: "Alex", newValue: "Sam",
      section: "Borrower Information", timestamp: "2026-11-04T12:00:00.000Z" });
    expect(rows[1].newValue).toBe("—");
    expect(rows[0].id).not.toBe(rows[1].id);
  });
  it("does not record unchanged values or internal workflow snapshots", () => {
    expect(changesForSave("fees", [{ id: "a", amount: 10 }], [{ id: "a", amount: 10 }], 1)).toEqual([]);
    expect(changesForSave("storage:loan-runtime-activity:1", "a", "b", 1)).toEqual([]);
  });
  it("matches rows by id and skips newly added rows", () => {
    const before = [{ id: "a", amount: 10 }, { id: "b", amount: 20 }];
    expect(changesForSave("fees", before, [...before].reverse(), 1)).toEqual([]);
    expect(changesForSave("fees", before, [...before, { id: "c", amount: 30 }], 1)).toEqual([]);
    const rows = changesForSave("fees", before, [{ id: "b", amount: 25 }], 2);
    expect(rows.map(r => [r.previousValue, r.newValue])).toEqual([["10", "—"], ["20", "25"]]);
  });
});
