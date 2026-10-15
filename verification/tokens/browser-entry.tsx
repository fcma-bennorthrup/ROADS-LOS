import React from "react";
import { createRoot } from "react-dom/client";
import { Forms, Collections, NavigationControls, SidebarControl, Box } from "./controls";
import { Overlay } from "./overlays";
import { ClosingDisclosureBorrowerEditor } from "@/components/loan/ClosingDisclosureBorrowerEditor";
import { ClosingDisclosureBorrowerCells } from "@/components/loan/ClosingDisclosureBorrowerCells";
import type { ClosingDisclosureRecord } from "@/lib/closing-disclosure-history";

const mode = new URLSearchParams(location.search).get("mode") || "forms";
const borrowers = [{id:"synthetic-primary",name:"Synthetic Primary",isPrimary:true},
  {id:"synthetic-secondary",name:"Synthetic Secondary",isPrimary:false}];
const record: ClosingDisclosureRecord = {id:1,generatedAt:"2026-10-14T16:00:00.000Z",
  deliveredAt:"2026-10-14T16:00:00.000Z",borrowerDetails:borrowers.map((b,i)=>({
    borrowerId:b.id,deliveryMethod:"Blend",deliveryDate:"2026-10-14",
    cdViewed:i ? "No" : "Yes", viewedDate:i ? "" : "2026-10-14"
  }))};
localStorage.clear();
localStorage.setItem("loan-closing-disclosures:synthetic", mode === "documents-error" ? "{invalid" :
  JSON.stringify({records:[record],resetToken:null}));
function Documents() {
  const members = mode === "documents-empty" ? [] : borrowers;
  return <Box name="Documents Sheet/popover"><ClosingDisclosureBorrowerEditor loanId="synthetic" record={record} borrowers={members} />
    <table><tbody><tr><ClosingDisclosureBorrowerCells loanId="synthetic" record={record} borrowers={members} deliveryFallback="Not delivered" /></tr></tbody></table>
  </Box>;
}
function Fixture() {
  React.useEffect(()=>{ (window as any).fixtureReady = true; }, []);
  return <main style={{padding:24,maxWidth:1100}}><h1 className="headline-100">Shared token verification</h1>
    {mode === "forms" ? <Forms /> : mode === "collections" ? <Collections /> :
      mode === "navigation" ? <NavigationControls /> : mode === "sidebar" ? <SidebarControl /> :
        mode.startsWith("documents") ? <Documents /> : <Overlay kind={mode} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
