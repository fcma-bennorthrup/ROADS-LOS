import React from "react";
import { createRoot } from "react-dom/client";
import { navigate } from "wouter/use-browser-location";
import App from "@/App";

const fixture = {
  navigate,
  calls: [] as string[],
  unexpected: [] as string[],
  finish: null as null | (() => void),
};
Object.assign(window, { fixture });
const deny = () => { throw new Error("BROWSER_EXTERNAL_OPERATION_BLOCKED"); };
window.open = deny;
XMLHttpRequest.prototype.open = deny;
Object.assign(window, { WebSocket: class { constructor() { deny(); } } });
window.fetch = async (input, init) => {
  const url = String(input);
  const method = init?.method ?? "GET";
  fixture.calls.push(`${method} ${url}`);
  if (url === "/api/github/conflicts" && method === "GET")
    return new Response(JSON.stringify({ hasConflicts: false, operation: null, conflicts: [] }));
  if (url === "/api/loans/1" && method === "GET")
    return new Response("null");
  if (url === "/api/github/pull" && method === "POST") {
    return new Promise(resolve => {
      fixture.finish = () => resolve(new Response(JSON.stringify({
        hasConflicts: true, commitSha: "synthetic",
        conflicts: [{ path: "synthetic.txt", reason: "both changed", localContent: "local",
          remoteContent: "remote", baseContent: "base" }],
      }), { status: 409 }));
    });
  }
  fixture.unexpected.push(`${method} ${url}`);
  return deny();
};
createRoot(document.getElementById("root")!).render(<App />);
