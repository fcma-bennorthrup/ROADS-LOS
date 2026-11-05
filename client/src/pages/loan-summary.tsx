import { useLoanQuery } from "@/hooks/use-loan-query";
import { useParams } from "wouter";
import { LoanHeader, BottomToolbar } from "@/components/loan/LoanHeader";
import { SummaryRatios } from "@/components/loan/SummaryRatios";
import { BorrowerCards } from "@/components/loan/BorrowerCards";
import { LoanActivityPanel } from "@/components/loan/LoanActivityPanel";
import { formatCurrency } from "@/lib/loan-display";

const money = (value: number | null) => value === null ? "—" : formatCurrency(String(value));
const percent = (value: number | null) => value === null ? "" : value.toFixed(2);

export default function LoanSummaryPage() {
  const params = useParams<{ id: string }>();
  const loanId = params.id || "1";

  const { data: loan, isLoading, error } = useLoanQuery(loanId);

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

  const summary = loan.summary;
  return (
    <div
      className="h-screen flex flex-row overflow-hidden"
      style={{ backgroundColor: "var(--roads-bg-page)" }}
      data-testid="loan-summary-page"
    >
      <div className="flex-1 flex flex-col min-w-0">
        <LoanHeader
          loanNumber={loan.loanNumber}
          cifNumber={loan.cifNumber}
          loanType={loan.loanType}
          borrowerName={loan.primaryBorrowerName}
          amount={money(summary.amountRequested)}
          applicationType={loan.applicationType}
          ecoaDaysRemaining={loan.ecoaDaysRemaining}
          tridDaysRemaining={loan.tridDaysRemaining}
        />
        <div className="flex flex-1 min-h-0">
          <main
            className="flex-1 flex flex-col overflow-y-auto"
            style={{
              paddingTop: "var(--roads-spacing-component-xl)",
              gap: "var(--roads-spacing-component-xl)",
              paddingBottom: "60px",
            }}
            data-testid="loan-content"
          >
            <BorrowerCards borrowers={loan.borrowers} />
            <SummaryRatios
              missing={summary.missing}
              pitiBreakdown={summary.pitiBreakdown}
              data={{
                piti: percent(summary.piti),
                dti: percent(summary.dti),
                lcv: percent(summary.lcv),
                pweCbScore: summary.pweCbScore,
                ruleOfXx: summary.ruleOfXx,
                totalCv: money(summary.totalCv),
                cashReserves: money(summary.cashReserves),
                totalLoanAmount: money(summary.totalLoanAmount),
                amountRequested: money(summary.amountRequested),
                financedFees: money(summary.financedFees),
                taxesInsurance: money(summary.taxesInsurance),
                product: summary.product ?? "—",
                finalRate: summary.finalRate === null ? "—" : `${percent(summary.finalRate)}%`,
                principalInterest: money(summary.principalInterest),
                totalMonthlyPayment: money(summary.totalMonthlyPayment),
                cashToClose: money(summary.cashToClose),
                apr: percent(summary.apr),
              }}
            />
          </main>
        </div>
        <div className="fixed bottom-0 left-0 w-full z-10">
          <BottomToolbar />
        </div>
      </div>
      <LoanActivityPanel />
    </div>
  );
}
