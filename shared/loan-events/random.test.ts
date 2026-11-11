import { expect, it } from "vitest";
import { deterministicRandom, pick } from "./random";

it("produces reproducible sequences with inclusive/exclusive bounds", () => {
  const first = deterministicRandom(23);
  const second = deterministicRandom(23);
  const other = deterministicRandom(24);
  const values = Array.from({ length: 100 }, () => first(-10, 15));
  expect(values).toEqual(Array.from({ length: 100 }, () => second(-10, 15)));
  expect(values).not.toEqual(Array.from({ length: 100 }, () => other(-10, 15)));
  expect(values.every(n => Number.isInteger(n) && n >= -10 && n < 15)).toBe(true);
  expect(first(5, 6)).toBe(5);
});
it("rejects invalid ranges and empty lists", () => {
  const random = deterministicRandom();
  for (const [min, max] of [[1, 1], [2, 1], [0.5, 2], [0, Infinity]])
    expect(() => random(min, max)).toThrow(RangeError);
  expect(() => pick(random, [])).toThrow(RangeError);
});
it("passes the list bounds to its injected random source", () => {
  expect(pick((min, max) => {
    expect([min, max]).toEqual([0, 3]);
    return max - 1;
  }, ["a", "b", "c"])).toBe("c");
});
