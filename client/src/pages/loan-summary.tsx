import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { LoanHeader, BottomToolbar } from "@/components/loan/LoanHeader";
import { SummaryRatios } from "@/components/loan/SummaryRatios";
import { BorrowerCards } from "@/components/loan/BorrowerCards";
import type { Loan, Borrower } from "@shared/schema";

interface LoanWithBorrowers extends Loan {
  borrowers: Borrower[];
}

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LoanSummaryPage() {
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
        <div
          className="headline-300"
          style={{ color: "var(--roads-text-secondary)" }}
        >
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
        <div
          className="headline-300"
          style={{ color: "var(--roads-text-error)" }}
        >
          Failed to load loan data
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--roads-bg-page)" }}
      data-testid="loan-summary-page"
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
      />
      <main
        className="flex-1 flex flex-col"
        style={{
          paddingTop: "var(--roads-spacing-component-xl)",
          gap: "var(--roads-spacing-component-xl)",
          paddingBottom: "60px",
        }}
        data-testid="loan-content"
      >
        <BorrowerCards borrowers={loan.borrowers} />
        <SummaryRatios
          data={{
            piti: loan.piti,
            dti: loan.dti,
            lcv: loan.lcv,
            pweCbScore: loan.pweCbScore,
            ruleOfXx: loan.ruleOfXx,
            totalCv: formatCurrency(loan.totalCv),
            cashReserves: formatCurrency(loan.cashReserves),
            totalLoanAmount: formatCurrency(loan.totalLoanAmount),
            amountRequested: formatCurrency(loan.amountRequested),
            financedFees: formatCurrency(loan.financedFees),
            taxesInsurance: formatCurrency(loan.taxesInsurance),
            product: loan.product,
            finalRate: `${loan.finalRate}%`,
            principalInterest: formatCurrency(loan.principalInterest),
            totalMonthlyPayment: formatCurrency(loan.totalMonthlyPayment),
          }}
        />
      </main>
      <div className="fixed bottom-0 left-0 w-full z-10">
        <BottomToolbar />
      </div>
    </div>
  );
}
