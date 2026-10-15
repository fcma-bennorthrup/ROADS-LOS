import React from "react";
import { createRoot } from "react-dom/client";
import { RoutedDocumentsFixture, loan, record, FIXED_TIME } from "../documents/fixture";
import * as historyApi from "../../client/src/lib/closing-disclosure-history";
import * as borrowerApi from "../../client/src/lib/closing-disclosure-borrowers";
import "../../client/src/index.css";

// Fixture only: no App, real API, external transports or document delivery.
const NativeDate = Date;
window.Date = new Proxy(NativeDate, {
  construct(target, args) { return Reflect.construct(target, args.length ? args : [FIXED_TIME]); },
  apply() { return new NativeDate(FIXED_TIME).toString(); },
  get(target, key) { return key === "now" ? () => new NativeDate(FIXED_TIME).getTime() : Reflect.get(target, key); },
});
const deny = () => { throw new Error("DISCLOSURE_FIXTURE_EXTERNAL_OPERATION_BLOCKED"); };
window.WebSocket = class { constructor() { deny(); } } as unknown as typeof WebSocket;
window.XMLHttpRequest.prototype.open = deny;
const opens: unknown[] = [];
window.open = (...args) => { opens.push(args); return null; };
window.confirm = () => true;
window.fetch = async (input) => {
  const path = String(input);
  if (!/^\/api\/loans\/(one|two)$/.test(path)) return deny();
  return new Response(JSON.stringify(loan(path.split("/").pop()!)));
};
const params = new URLSearchParams(location.search);
if (params.has("noLocks")) Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
// Only the first page seeds; a second page must share, not clear, storage.
if (params.has("seed")) {
  localStorage.clear();
  localStorage.setItem(historyApi.closingDisclosureStorageKey("one"), JSON.stringify(
    Array.from({ length: 16 }, (_, i) => ({ ...record, id: i + 1 })),
  ));
}
Object.assign(window, { disclosureVerification: { historyApi, borrowerApi, opens } });
history.replaceState(null, "", `/loans/one/documents${location.search}`);
createRoot(document.getElementById("root")!).render(<RoutedDocumentsFixture />);
