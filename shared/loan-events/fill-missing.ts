function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
}

/** Fill blanks only. Arrays are atomic and neither input is mutated. */
export function fillMissing<T>(existing: T, incoming: unknown): T;
export function fillMissing(existing: unknown, incoming: unknown): unknown {
  if (isMissing(existing)) return structuredClone(incoming);
  if (isPlainObject(existing) && isPlainObject(incoming)) {
    return Object.fromEntries(
      [...new Set([...Object.keys(existing), ...Object.keys(incoming)])].map(key => [
        key,
        Object.hasOwn(incoming, key)
          ? fillMissing(Object.hasOwn(existing, key) ? existing[key] : undefined, incoming[key])
          : structuredClone(existing[key]),
      ]),
    );
  }
  return structuredClone(existing);
}
