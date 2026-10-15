import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import LoanHistoryPage from "@/pages/loan-history";
import { loan } from "../history/fixtures";

const RealDate = Date;
window.Date = class extends RealDate {
  constructor(...args: any[]) {
    // @ts-expect-error Native variadic Date overloads are deliberately retained.
    super(...(args.length ? args : ["2026-10-14T16:00:00Z"]));
  }
  static now() { return 1791993600000; }
} as DateConstructor;
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
  if (mode === "dropdown") {
    document.querySelector<HTMLButtonElement>('[data-testid="button-next-page"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-testid="select-items-per-page"]')!.click();
    document.querySelector('[data-testid="change-log-footer"]')!.scrollIntoView({ block: "end" });
  }
  setTimeout(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("[data-testid]")];
    const output = document.createElement("script");
    output.id = "capture-result";
    output.type = "application/json";
    output.textContent = JSON.stringify({
      ready: document.querySelectorAll('[data-testid^="change-log-row-"]').length === 20,
      viewport: [innerWidth, innerHeight],
      mode,
      activityOpen: !!document.querySelector('[data-testid="loan-activity-panel"]'),
      dropdownOpen: !!document.querySelector('[data-testid="select-items-per-page-option-20"]'),
      elements: elements.map(el => {
        const style = getComputedStyle(el);
        return { id: el.dataset.testid, text: el.textContent, rect: el.getBoundingClientRect().toJSON(),
          font: style.font, color: style.color, background: style.backgroundColor,
          padding: style.padding, gap: style.gap, overflow: style.overflow,
          scroll: [el.scrollTop, el.scrollLeft, el.scrollHeight, el.scrollWidth] };
      }),
    });
    document.body.append(output);
  }, 150);
}, 200);
