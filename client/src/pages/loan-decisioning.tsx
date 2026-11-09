import { useState } from "react";
import { useSearch } from "wouter";
import { useWorkspaceLoan } from "@/components/loan/LoanWorkspace";
import { SideNav } from "@/components/loan/SideNav";
import { DecisioningSummaryContent } from "@/components/loan/DecisioningSummaryContent";
import { BorrowerFinancialsContent } from "@/components/loan/BorrowerFinancialsContent";

const DECISIONING_NAV_ITEMS = ["Decisioning Summary", "Borrower Financials"];
export default function LoanDecisioningPage() {
  const loan = useWorkspaceLoan();
  const search = useSearch();
  const [activeNavItem, setActiveNavItem] = useState(() => {
    const section = new URLSearchParams(search).get("section") ?? "";
    return DECISIONING_NAV_ITEMS.includes(section) ? section : "Decisioning Summary";
  });
  return <>
    <SideNav activeItem={activeNavItem} onItemChange={setActiveNavItem} items={DECISIONING_NAV_ITEMS} />
    <div className="flex flex-1 flex-col overflow-y-auto" style={{ minWidth: 0, paddingBottom: "36px" }}>
      {activeNavItem === "Decisioning Summary" && <DecisioningSummaryContent loanNumber={loan.loanNumber} borrowerName={loan.primaryBorrowerName} />}
      {activeNavItem === "Borrower Financials" && <BorrowerFinancialsContent />}
    </div>
  </>;
}
