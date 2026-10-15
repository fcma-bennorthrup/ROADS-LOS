/**
 * Read the first loan segment from a location that starts with /loans/.
 * Keep the caller's fallback and the raw segment (no URL decoding/validation).
 */
export function loanIdFromPath(location: string, fallback: string): string {
  return location.match(/^\/loans\/([^/]+)/)?.[1] ?? fallback;
}
