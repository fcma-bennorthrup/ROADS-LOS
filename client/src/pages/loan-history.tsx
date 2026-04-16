import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { LoanHeader, BottomToolbar } from "@/components/loan/LoanHeader";
import { HistoryContent } from "@/components/loan/HistoryContent";
import type { Loan, Borrower } from "@shared/schema";

interface LoanWithBorrowers extends Loan {
  borrowers: Borrower[];
}

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LoanHistoryPage() {
  const params = useParams<{ id: string }>();
  const loanId = params.id || "1";

  const { data: loan, isLoading, error } = useQuery<LoanWithBorrowers>({
    queryKey: ["/api/loans", loanId],
  });

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: "var(--roads-bg-page)" }}
        data-testid="loading-state"
      >
        <div className="headline-300" style={{ color: "var(--roads-text-secondary)" }}>
          Loading loan details...
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: "var(--roads-bg-page)" }}
        data-testid="error-state"
      >
        <div className="headline-300" style={{ color: "var(--roads-text-error)" }}>
          Failed to load loan data
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--roads-bg-page)" }}
      data-testid="loan-history-page"
    >
      <LoanHeader
        loanNumber={loan.loanNumber}
        cifNumber={loan.cifNumber}
        loanType={loan.loanType}
        borrowerName={loan.primaryBorrowerName}
        amount={formatCurrency(loan.displayAmount)}
        applicationType={loan.applicationType}
        ecoaDaysRemaining={loan.ecoaDaysRemaining}
        tridDaysRemaining={loan.tridDaysRemaining}
        activeTab="History"
      />
      <div className="flex-1 overflow-y-auto" style={{ minWidth: 0, paddingBottom: "36px" }}>
        <HistoryContent />
      </div>
      <div className="fixed bottom-0 left-0 w-full z-10">
        <BottomToolbar />
      </div>
    </div>
  );
}
