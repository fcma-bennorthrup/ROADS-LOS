import React from "react";
import { createRoot } from "react-dom/client";
import { RoutedDocumentsFixture, loan, record, FIXED_TIME } from "./fixture";
import "../../client/src/index.css";

// Synthetic API only. A second browser-side route guard is required by the
// browser test instructions. No App, server adapter, or live request is used.
const NativeDate = Date;
window.Date = new Proxy(NativeDate, {
  construct(target, args) { return Reflect.construct(target, args.length ? args : [FIXED_TIME]); },
  apply() { return new NativeDate(FIXED_TIME).toString(); },
  get(target, key) { return key === "now" ? () => new NativeDate(FIXED_TIME).getTime() : Reflect.get(target, key); },
});
const deny = () => { throw new Error("DOCUMENTS_FIXTURE_EXTERNAL_OPERATION_BLOCKED"); };
window.WebSocket = class { constructor() { deny(); } } as unknown as typeof WebSocket;
window.XMLHttpRequest.prototype.open = deny;
const calls: unknown[] = [];
const opens: unknown[] = [];
window.open = (...args) => { opens.push(args); return null; };
window.confirm = () => true;
const scenario = new URLSearchParams(location.search).get("scenario") || "success";
window.fetch = async (input, init) => {
  const path = String(input);
  calls.push([path, init]);
  if (!/^\/api\/loans\/(one|two)$/.test(path)) return deny();
  if (scenario === "delayed") await new Promise(resolve => setTimeout(resolve, 2000));
  if (scenario === "404") return new Response("Synthetic missing", { status: 404 });
  if (scenario === "invalid") return new Response("<html>");
  return new Response(JSON.stringify(loan(path.split("/").pop()!, scenario === "empty")));
};
localStorage.clear();
localStorage.setItem("loan-closing-disclosures:one", JSON.stringify(
  Array.from({ length: 16 }, (_, i) => ({ ...record, id: i + 1 })),
));
// Controls are exposed only to automation, never inserted into production DOM.
Object.assign(window, { documentsVerification: {
  calls, opens,
  navigate(path: string) { history.pushState(null, "", path); dispatchEvent(new PopStateEvent("popstate")); },
} });
history.replaceState(null, "", `/loans/one/documents${location.search}`);
createRoot(document.getElementById("root")!).render(<RoutedDocumentsFixture />);
