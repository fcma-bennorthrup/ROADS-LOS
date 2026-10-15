import React from "react";
import { createRoot } from "react-dom/client";
import { RoutedDocumentsFixture, loan, record, FIXED_TIME } from "../documents/fixture";
import "../../client/src/index.css";

// Disposable fixture only: never App, a live server, or an admin transport.
const NativeDate = Date;
window.Date = new Proxy(NativeDate, {
  construct(target, args) { return Reflect.construct(target, args.length ? args : [FIXED_TIME]); },
  apply() { return new NativeDate(FIXED_TIME).toString(); },
  get(target, key) { return key === "now" ? () => new NativeDate(FIXED_TIME).getTime() : Reflect.get(target, key); },
});
const deny = () => { throw new Error("PARTIAL_RESET_EXTERNAL_OPERATION_BLOCKED"); };
window.WebSocket = class { constructor() { deny(); } } as unknown as typeof WebSocket;
window.XMLHttpRequest.prototype.open = deny;
const calls: unknown[] = [];
const opens: unknown[] = [];
window.open = (...args) => { opens.push(args); return null; };
window.fetch = async (input, init) => {
  const path = String(input);
  calls.push([path, init]);
  if (!/^\/api\/loans\/(one|two)$/.test(path)) return deny();
  return new Response(JSON.stringify(loan(path.split("/").pop()!)));
};
const params = new URLSearchParams(location.search);
localStorage.clear();
for (const id of ["one", "two"]) {
  localStorage.setItem(`loan-closing-disclosures:${id}`, JSON.stringify([record]));
  localStorage.setItem(`loan-closing-package:${id}`, JSON.stringify({
    generatedAt: FIXED_TIME, deliveredAt: FIXED_TIME,
    generatingUntil: params.has("timer") ? "2026-10-14T16:00:05.000Z" : null,
  }));
  localStorage.setItem(`loan-checklist-statuses:${id}`, JSON.stringify({
    "Loan Decision": ["complete"], "Closing Package": ["complete", "complete", "complete"],
    "Closing Disclosure": ["complete", "complete"],
  }));
  localStorage.setItem(`loan-runtime-activity:${id}`, JSON.stringify([{
    id: "synthetic", title: "Synthetic reset activity", description: "Disposable fixture",
    timestamp: "10/14/2026", date: FIXED_TIME,
  }]));
}
const setItem = Storage.prototype.setItem;
const removeItem = Storage.prototype.removeItem;
let deniedKey: string | null = null;
Storage.prototype.setItem = function (key, value) {
  if (key === deniedKey) throw new Error("Synthetic denied write");
  return setItem.call(this, key, value);
};
Storage.prototype.removeItem = function (key) {
  if (key === deniedKey) throw new Error("Synthetic denied removal");
  return removeItem.call(this, key);
};
let confirmResult = true;
window.confirm = () => confirmResult;
const queue: Array<(fail?: boolean) => void> = [];
Object.defineProperty(navigator, "locks", { configurable: true, value: params.has("queue") ? {
  request(_key: string, write: () => void) {
    return new Promise<void>((resolve, reject) => {
      queue.push((fail) => {
        try {
          if (fail) throw new Error("Synthetic lock failure");
          write();
          resolve();
        } catch (error) { reject(error); }
      });
    });
  },
} : undefined });
Object.assign(window, { resetFixture: {
  calls, opens,
  confirm(value: boolean) { confirmResult = value; },
  deny(key: string | null) { deniedKey = key; },
  release(fail = false) { queue.shift()?.(fail); },
  queued() { return queue.length; },
  storage() { return { ...localStorage }; },
  navigate(id: string) {
    history.pushState(null, "", `/loans/${id}/documents`);
    dispatchEvent(new PopStateEvent("popstate"));
  },
} });
history.replaceState(null, "", "/loans/one/documents");
createRoot(document.getElementById("root")!).render(<RoutedDocumentsFixture />);
