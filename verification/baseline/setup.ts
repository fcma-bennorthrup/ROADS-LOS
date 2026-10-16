import { beforeEach, vi } from "vitest";

beforeEach(() => {
  // Freeze wall-clock Date only; existing tests retain control of fake timers.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T16:00:00.000Z"));
  const deny = () => { throw new Error("VALIDATION_EXTERNAL_TRANSPORT_BLOCKED"); };
  vi.stubGlobal("fetch", deny);
  vi.stubGlobal("WebSocket", class { constructor() { deny(); } });
  XMLHttpRequest.prototype.open = deny;
  window.open = deny;
});
