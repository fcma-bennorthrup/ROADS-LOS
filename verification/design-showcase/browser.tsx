import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Page from "../../client/src/pages/design-system";

const deny = () => { throw new Error("SHOWCASE_EXTERNAL_OPERATION_BLOCKED"); };
window.fetch = deny;
window.open = deny;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as any;
const NativeDate = Date;
window.Date = class extends NativeDate {
  constructor(...args: any[]) { super(args.length ? args[0] : "2026-10-14T16:00:00Z"); }
  static now() { return +new NativeDate("2026-10-14T16:00:00Z"); }
} as DateConstructor;
let root = createRoot(document.getElementById("root")!);
const mount = () => flushSync(() => root.render(<Page />));
mount();
(window as any).remount = () => {
  flushSync(() => root.unmount());
  root = createRoot(document.getElementById("root")!);
  mount();
};
