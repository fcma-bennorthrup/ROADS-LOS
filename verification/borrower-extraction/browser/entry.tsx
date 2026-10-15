import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BorrowerInformationContent as Baseline } from "../BorrowerInformationBaseline";
import { BorrowerInformationContent as Candidate } from "@/components/loan/BorrowerInformationContent";
import "@/index.css";

const deny = () => { throw new Error("EXTERNAL_TRANSPORT_BLOCKED"); };
window.fetch = deny;
window.open = deny;
XMLHttpRequest.prototype.open = deny;
window.WebSocket = class { constructor() { deny(); } } as typeof WebSocket;
const NativeDate = Date;
window.Date = class extends NativeDate {
  constructor(...args: any[]) {
    if (!args.length) super("2026-10-14T16:00:00.000Z");
    else super(args[0]);
  }
  static now() { return new NativeDate("2026-10-14T16:00:00.000Z").getTime(); }
} as DateConstructor;
function Fixture() {
  const [shown, setShown] = useState(true);
  const Component = new URLSearchParams(location.search).get("version") === "baseline" ? Baseline : Candidate;
  return <>
    <button data-testid="fixture-section-toggle" onClick={() => setShown(!shown)}>Toggle section</button>
    {shown && <Component />}
  </>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
