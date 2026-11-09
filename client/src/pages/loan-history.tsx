import { useLoanId } from "@/contexts/loan-id-context";
import { HistoryContent } from "@/components/loan/HistoryContent";

export default function LoanHistoryPage() {
  const loanId = useLoanId();
  return <div className="flex flex-1 flex-col overflow-y-auto" style={{ minWidth: 0, paddingBottom: "36px" }}>
    <HistoryContent loanId={loanId} />
  </div>;
}
