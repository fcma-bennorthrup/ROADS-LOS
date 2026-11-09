import { useWorkspaceLoan } from "@/components/loan/LoanWorkspace";
import { SummaryRatios } from "@/components/loan/SummaryRatios";
import { BorrowerCards } from "@/components/loan/BorrowerCards";
import { formatCurrency } from "@/lib/loan-display";

const money = (value: number | null) => value === null ? "—" : formatCurrency(String(value));
const percent = (value: number | null) => value === null ? "" : value.toFixed(2);

export default function LoanSummaryPage() {
  const loan = useWorkspaceLoan();
  const summary = loan.summary;
  return <main className="flex-1 flex flex-col overflow-y-auto"
    style={{ paddingTop: "var(--roads-spacing-component-xl)", gap: "var(--roads-spacing-component-xl)", paddingBottom: "60px" }}
    data-testid="loan-content">
    <BorrowerCards borrowers={loan.borrowers} />
    <SummaryRatios pitiBreakdown={summary.pitiBreakdown} data={{
      piti: percent(summary.piti), dti: percent(summary.dti), lcv: percent(summary.lcv),
      pweCbScore: summary.pweCbScore, ruleOfXx: summary.ruleOfXx, totalCv: money(summary.totalCv),
      cashReserves: money(summary.cashReserves), totalLoanAmount: money(summary.totalLoanAmount),
      amountRequested: money(summary.amountRequested), financedFees: money(summary.financedFees),
      taxesInsurance: money(summary.taxesInsurance), product: summary.product ?? "—",
      finalRate: summary.finalRate === null ? "—" : `${percent(summary.finalRate)}%`,
      principalInterest: money(summary.principalInterest), totalMonthlyPayment: money(summary.totalMonthlyPayment),
      cashToClose: money(summary.cashToClose), apr: percent(summary.apr),
    }} />
  </main>;
}
