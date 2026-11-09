import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useWorkspaceLoan } from "@/components/loan/LoanWorkspace";
import { SideNav } from "@/components/loan/SideNav";
import { CollateralContent } from "@/components/loan/CollateralContent";
import { ProductPricingContent } from "@/components/loan/ProductPricingContent";
import { LoanDetailsContent } from "@/components/loan/LoanDetailsContent";
import { FeesContent } from "@/components/loan/FeesContent";
import { BorrowerInformationContent } from "@/components/loan/BorrowerInformationContent";
import { formatCurrency } from "@/lib/loan-display";

const VALID_NAV_ITEMS = ["Borrower Information", "Loan Details", "Collateral", "Product & Pricing", "Fees"];

export default function LoanOriginationPage() {
  const loan = useWorkspaceLoan();
  const searchString = useSearch();
  const [activeNavItem, setActiveNavItem] = useState("Borrower Information");
  useEffect(() => {
    const section = new URLSearchParams(searchString).get("section");
    if (section && VALID_NAV_ITEMS.includes(section)) setActiveNavItem(section);
  }, [searchString]);
  return <>
    <SideNav activeItem={activeNavItem} onItemChange={setActiveNavItem} />
    <div className="flex flex-1 flex-col overflow-y-auto" style={{ minWidth: 0, paddingBottom: "36px" }}>
      {activeNavItem === "Collateral" && <CollateralContent key={loan.id} loanNumber={loan.loanNumber} borrowerName={loan.primaryBorrowerName} borrowers={loan.borrowers} />}
      {activeNavItem === "Product & Pricing" && <ProductPricingContent loanNumber={loan.loanNumber} borrowerName={loan.primaryBorrowerName} />}
      {activeNavItem === "Loan Details" && <LoanDetailsContent initialRequestedLoanAmount={formatCurrency(loan.amountRequested)} />}
      {activeNavItem === "Fees" && <FeesContent />}
      {activeNavItem === "Borrower Information" && <BorrowerInformationContent />}
    </div>
  </>;
}
