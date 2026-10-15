// Reuse the safe routed fixture, fixed clock, fake transport and disposable storage.
import "../package-progress/browser";

const complete: Array<() => void> = [];
const nativeTimeout = window.setTimeout.bind(window);
window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
  if (ms === 5000 && typeof fn === "function") {
    complete.push(() => fn(...args));
    return nativeTimeout(() => {}, 600000);
  }
  return nativeTimeout(fn, ms, ...args);
}) as typeof window.setTimeout;
Object.assign(window, { localDocumentFixture: {
  finish() { complete.splice(0).forEach(fn => fn()); },
} });
