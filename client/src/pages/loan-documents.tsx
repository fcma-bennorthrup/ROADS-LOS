import { useState } from "react";
import { useWorkspaceLoan } from "@/components/loan/LoanWorkspace";
import { SideNav } from "@/components/loan/SideNav";
import { DocumentsContent, ClosingDocumentsContent, DOCUMENTS_NAV_ITEMS } from "@/components/loan/DocumentsContent";

export default function LoanDocumentsPage() {
  const loan = useWorkspaceLoan();
  const [activeNavItem, setActiveNavItem] = useState("Disclosures");
  return <>
    <SideNav activeItem={activeNavItem} onItemChange={setActiveNavItem} items={DOCUMENTS_NAV_ITEMS} />
    <div className="flex flex-1 flex-col overflow-y-auto" style={{ minWidth: 0, paddingBottom: "36px" }}>
      {activeNavItem === "Disclosures" && <DocumentsContent />}
      {activeNavItem === "Closing Documents" && <ClosingDocumentsContent loanId={loan.id} borrowers={loan.borrowers} />}
    </div>
  </>;
}
