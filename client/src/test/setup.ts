import "@testing-library/jest-dom";
import { beforeEach } from "vitest";

beforeEach(() => {
  localStorage.clear();
  // Serial DOM tests model a supported browser with an immediately granted
  // lock. This deliberately synchronous fake preserves their timer assertions;
  // it is NOT evidence of real cross-window serialization. Async queue tests
  // override it, and unsupported-browser tests explicitly remove it.
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: { request: (_name: string, callback: () => void) => callback() },
  });
});
