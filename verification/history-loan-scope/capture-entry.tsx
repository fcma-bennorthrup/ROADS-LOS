import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import LoanHistoryPage from "@/pages/loan-history";
import { loan } from "../history/fixtures";

queryClient.setQueryData(["/api/loans", "2"], { ...loan, id: "2" });
const deny = () => { throw Error("External operation blocked"); };
window.fetch = deny;
window.open = deny;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as typeof WebSocket;
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}><LoanHistoryPage /></QueryClientProvider>,
);
setTimeout(() => {
  const mode = new URLSearchParams(location.search).get("mode");
  if (mode === "dropdown") document.querySelector<HTMLButtonElement>('[data-testid="select-items-per-page"]')!.click();
  const table = document.querySelector('[data-testid="change-log-table"]')!.getBoundingClientRect();
  const content = document.querySelector('[data-testid="history-content"]')!.getBoundingClientRect();
  const footer = document.querySelector('[data-testid="change-log-footer"]')!.getBoundingClientRect();
  setTimeout(() => {
    const result = {
      ready: document.querySelectorAll('[data-testid^="change-log-row-"]').length === 0
        // Minimum-content overflow remains scrollable on very narrow layouts.
        && content.bottom >= innerHeight - 38
        && Math.abs(table.bottom - (content.bottom - 24)) < 2
        && Math.abs(footer.bottom - table.bottom) < 2,
      viewport: [innerWidth, innerHeight],
      mode, table: table.toJSON(), content: content.toJSON(), footer: footer.toJSON(),
      activityOpen: !!document.querySelector('[data-testid="loan-activity-panel"]'),
      dropdownOpen: !!document.querySelector('[data-testid="select-items-per-page-option-20"]'),
    };
    const output = document.createElement("script");
    output.id = "capture-result";
    output.type = "application/json";
    output.textContent = JSON.stringify(result);
    document.body.append(output);
  }, 100);
}, 200);
