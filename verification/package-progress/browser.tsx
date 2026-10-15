import React from "react";
import { createRoot } from "react-dom/client";
import { RoutedDocumentsFixture, loan, FIXED_TIME } from "../documents/fixture";
import "../../client/src/index.css";

const NativeDate = Date;
window.Date = new Proxy(NativeDate, {
  construct(target, args) { return Reflect.construct(target, args.length ? args : [FIXED_TIME]); },
  apply() { return new NativeDate(FIXED_TIME).toString(); },
  get(target, key) { return key === "now" ? () => new NativeDate(FIXED_TIME).getTime() : Reflect.get(target, key); },
});
const deny = () => { throw new Error("PACKAGE_FIXTURE_EXTERNAL_OPERATION_BLOCKED"); };
window.WebSocket = class { constructor() { deny(); } } as unknown as typeof WebSocket;
window.XMLHttpRequest.prototype.open = deny;
const opens: unknown[] = [];
window.open = (...args) => { opens.push(args); return null; };
window.fetch = async (input) => {
  if (String(input) !== "/api/loans/one") return deny();
  return new Response(JSON.stringify(loan("one")));
};
// Hold the animated ellipsis and long operation timer at the same frame in both
// copies; real deadline behavior is verified separately with fake-clock tests.
const nativeTimeout = window.setTimeout.bind(window);
window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
  nativeTimeout(fn, ms === 5000 ? 600000 : ms, ...args)) as typeof window.setTimeout;
window.setInterval = (() => 0) as typeof window.setInterval;
Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
localStorage.clear();
const mode = location.hash.slice(1);
if (mode !== "idle") localStorage.setItem("loan-closing-package:one", mode === "error" ? "invalid" : JSON.stringify({
  generatedAt: mode === "generating" ? null : "2026-10-14T15:59:55.000Z",
  deliveredAt: mode === "delivered" || mode === "write-error" ? FIXED_TIME : null,
  generatingUntil: mode === "generating" ? "2026-10-14T16:00:05.000Z" : null,
}));
if (mode === "write-error") {
  const write = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (key === "loan-closing-package:one") throw new Error("Synthetic write failure");
    return write.call(this, key, value);
  };
}
Object.assign(window, { packageFixture: { opens } });
const route = (() => ["/loans/one/documents", () => {}]) as React.ComponentProps<typeof RoutedDocumentsFixture>["hook"];
createRoot(document.getElementById("root")!).render(<RoutedDocumentsFixture hook={route} />);
