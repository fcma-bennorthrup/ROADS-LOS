import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import LoanHistoryPage from "@/pages/loan-history";
import { loan } from "./fixtures";

queryClient.setQueryData(["/api/loans", "synthetic-B"], loan);
const deny = () => { throw new Error("HISTORY_CAPTURE_EXTERNAL_OPERATION_BLOCKED"); };
window.fetch = deny;
window.open = deny;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as typeof WebSocket;
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}><LoanHistoryPage /></QueryClientProvider>,
);

// Deterministic capture setup only, not production interaction replacement.
setTimeout(() => {
  const mode = new URLSearchParams(location.search).get("mode");
  if (mode === "dropdown") {
    document.querySelector<HTMLButtonElement>('[data-testid="select-items-per-page"]')!.click();
    document.querySelector('[data-testid="change-log-footer"]')!.scrollIntoView({ block: "end" });
  }
  setTimeout(() => {
    const root = document.querySelector('[data-testid="loan-history-page"]');
    const footer = document.querySelector('[data-testid="change-log-footer"]')!;
    const rows = document.querySelectorAll('[data-testid^="change-log-row-"]');
    const cell = document.querySelector('[data-testid="td-field-1"]')!;
    const style = getComputedStyle(cell);
    const result = {
      ready: !!root && rows.length === 20,
      viewport: [innerWidth, innerHeight],
      mode: mode || "closed",
      rows: rows.length,
      activityOpen: !!document.querySelector('[data-testid="loan-activity-panel"]'),
      dropdownOpen: !!document.querySelector('[data-testid="select-items-per-page-option-20"]'),
      footer: footer.getBoundingClientRect().toJSON(),
      cell: { fontFamily: style.fontFamily, fontSize: style.fontSize,
        color: style.color, padding: style.padding, lineHeight: style.lineHeight },
      // document.fonts.check cannot establish the actual chosen face when no
      // @font-face was loaded; do not misreport fallback as a loaded font.
      fontState: "External fonts blocked; system fallback",
    };
    const output = document.createElement("script");
    output.id = "capture-result";
    output.type = "application/json";
    output.textContent = JSON.stringify(result);
    document.body.append(output);
  }, 100);
}, 200);
