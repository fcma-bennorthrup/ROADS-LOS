import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useLoanId } from "@/contexts/loan-id-context";
import { useLoanQuery } from "@/hooks/use-loan-query";
import { LoanHeader, BottomToolbar } from "./LoanHeader";
import { LoanActivityPanel } from "./LoanActivityPanel";
import { formatCurrency, type LoanWithBorrowers } from "@/lib/loan-display";
import { Button } from "@/components/ui/button";
import { MainNavigation } from "@/components/MainNavigation";

const WorkspaceLoan = createContext<LoanWithBorrowers | null>(null);
export function useWorkspaceLoan() {
  const loan = useContext(WorkspaceLoan);
  if (!loan) throw new Error("Loan content requires LoanWorkspace.");
  return loan;
}
const tabs: Record<string, string> = {
  "/": "Summary", "/origination": "Origination", "/decisioning": "Decisioning",
  "/closing-booking": "Closing & Booking", "/documents": "Documents", "/history": "History",
};
export function LoanWorkspace({ children }: { children: ReactNode }) {
  const id = useLoanId();
  const [route] = useLocation();
  const location = route.length > 1 ? route.replace(/\/$/, "") : route;
  const { data: loan, isLoading, error, refetch } = useLoanQuery(id);
  if (isLoading) return <div data-testid="loading-state" role="status" className="animate-pulse" style={{ padding: "var(--roads-spacing-component-xl)", background: "var(--roads-bg-light)" }}>Loading loan details...</div>;
  if (error || !loan) return <div data-testid="error-state" role="alert" style={{ padding: "var(--roads-spacing-component-xl)", color: "var(--roads-text-error)" }}>
    Failed to load loan data <Button onClick={() => refetch()}>Retry</Button>
  </div>;
  const page = location === "/" ? "summary" : location.slice(1);
  const amount = loan.summary.amountRequested;
  return <WorkspaceLoan.Provider value={loan}>
    <MainNavigation loanActive />
    <div className="roads-loan-shell h-screen min-h-[100dvh] flex flex-row overflow-hidden" style={{ backgroundColor: "var(--roads-bg-page)" }} data-testid={`loan-${page}-page`}>
      <div className="flex-1 flex flex-col min-w-0">
        <LoanHeader loanNumber={loan.loanNumber} cifNumber={loan.cifNumber} loanType={loan.loanType}
          borrowerName={loan.primaryBorrowerName}
          amount={location === "/" ? amount === null ? "—" : formatCurrency(String(amount)) : formatCurrency(loan.displayAmount)}
          applicationType={loan.applicationType} ecoaDaysRemaining={loan.ecoaDaysRemaining}
          tridDaysRemaining={loan.tridDaysRemaining} activeTab={tabs[location] ?? "Summary"} />
        <div className="flex flex-1 min-h-0">{children}</div>
        <div className="roads-loan-bottom-toolbar"><BottomToolbar /></div>
      </div>
      <LoanActivityPanel />
    </div>
  </WorkspaceLoan.Provider>;
}
