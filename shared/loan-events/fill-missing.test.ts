import { describe, expect, it } from "vitest";
import { fillMissing } from "./fill-missing";

describe("fillMissing", () => {
  it.each([undefined, null, "", " \t\n", []])("fills a blank %j", blank => {
    expect(fillMissing(blank, "incoming")).toBe("incoming");
  });
  it.each([false, 0, true, 12, "saved", " saved ", [0], [null]])(
    "preserves nonblank %j", existing => {
      expect(fillMissing(existing, "incoming")).toEqual(existing);
    },
  );
  it("merges nested plain objects and retains existing-only keys", () => {
    expect(fillMissing(
      { saved: "yes", onlyHere: 1, nested: { blank: " ", keep: false, zero: 0 } },
      { saved: "no", added: 2, nested: { blank: "filled", keep: true, zero: 9, new: 3 } },
    )).toEqual({
      saved: "yes", onlyHere: 1, added: 2,
      nested: { blank: "filled", keep: false, zero: 0, new: 3 },
    });
  });
  it("fills absent, undefined and null properties but keeps existing-only blanks", () => {
    expect(fillMissing({ a: undefined, b: null, retained: undefined }, { a: 1, b: 2, c: 3 }))
      .toEqual({ a: 1, b: 2, c: 3, retained: undefined });
  });
  it("treats arrays atomically rather than merging their records", () => {
    expect(fillMissing({ rows: [{ blank: "" }], empty: [] }, {
      rows: [{ blank: "incoming" }, { extra: true }], empty: [{ added: true }],
    })).toEqual({ rows: [{ blank: "" }], empty: [{ added: true }] });
  });
  it("preserves incompatible nonblank values and does not merge nonplain objects", () => {
    const date = new Date("2026-11-11T00:00:00Z");
    expect(fillMissing(date, { extra: true })).toEqual(date);
    expect(fillMissing({ a: 1 }, [2])).toEqual({ a: 1 });
    expect(fillMissing("saved", { a: 1 })).toBe("saved");
    expect(fillMissing({}, { a: 1 })).toEqual({ a: 1 });
  });
  it("accepts null-prototype plain objects without treating inherited keys as data", () => {
    const existing = Object.assign(Object.create(null), { value: "" });
    expect(fillMissing(existing, { value: "filled" })).toEqual({ value: "filled" });
    const result = fillMissing({}, JSON.parse('{"__proto__":{"polluted":true}}'));
    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("never mutates inputs or aliases returned nested data", () => {
    const existing = Object.freeze({ kept: Object.freeze([{ a: 1 }]), nested: Object.freeze({}) });
    const incoming = Object.freeze({ kept: [], nested: Object.freeze({ added: Object.freeze([2]) }) });
    const before = structuredClone({ existing, incoming });
    const result = fillMissing(existing, incoming) as { kept: { a: number }[]; nested: { added: number[] } };
    result.kept[0].a = 9;
    result.nested.added.push(3);
    expect({ existing, incoming }).toEqual(before);
  });
});
