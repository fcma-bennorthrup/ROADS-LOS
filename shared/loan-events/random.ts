/** Compatible with node:crypto randomInt; the upper bound is exclusive. */
export type RandomInt = (min: number, maxExclusive: number) => number;

export function pick<T>(random: RandomInt, values: readonly T[]): T {
  if (values.length === 0) throw new RangeError("Cannot pick from an empty list.");
  return values[random(0, values.length)];
}

/** Reproducible, non-cryptographic source for fixtures and tests only. */
export function deterministicRandom(seed = 1): RandomInt {
  let state = seed >>> 0;
  return (min, maxExclusive) => {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(maxExclusive) ||
        maxExclusive <= min || !Number.isSafeInteger(maxExclusive - min)) {
      throw new RangeError("Expected safe integer bounds with min < maxExclusive.");
    }
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + Math.floor((state / 0x100000000) * (maxExclusive - min));
  };
}
