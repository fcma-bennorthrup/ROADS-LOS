import { expect, it } from "vitest";
import { syntheticBorrower } from "./synthetic-borrower";
import { deterministicRandom } from "./random";
import { vi } from "vitest";

it("does not generate replacement values when the full identity is known", () => {
  const now = new Date("2026-11-11T00:00:00Z");
  const known = syntheticBorrower({ cif: "123456", now, random: deterministicRandom(42) });
  const random = vi.fn(() => { throw new Error("Unexpected random draw"); });
  expect(syntheticBorrower({ cif: "123456", now, random, known })).toEqual(known);
  expect(random).not.toHaveBeenCalled();
});

it("generates reproducible synthetic identities without consulting a clock", () => {
  const now = new Date("2026-11-11T00:00:00Z");
  const make = (seed: number) => syntheticBorrower({ cif: "123456", now, random: deterministicRandom(seed) });
  expect(make(4)).toEqual(make(4));
  expect(make(4)).not.toEqual(make(5));
  expect(now.toISOString()).toBe("2026-11-11T00:00:00.000Z");
  for (let seed = 0; seed < 50; seed++) {
    const borrower = make(seed);
    expect(borrower.phone).toMatch(/^\(\d{3}\) 555-01\d{2}$/);
    expect(borrower.ssn).toMatch(/^000-\d{2}-\d{4}$/);
    expect(borrower.email).toBe(`${borrower.firstName.toLowerCase()}.${borrower.lastName.toLowerCase()}.123456@example.com`);
    expect(new Date(borrower.dob).toISOString().slice(0, 10)).toBe(borrower.dob);
    expect(borrower.address).toMatch(/^\d{3} Example Lane$/);
    expect(borrower.maritalStatus).toBe("");
  }
});
