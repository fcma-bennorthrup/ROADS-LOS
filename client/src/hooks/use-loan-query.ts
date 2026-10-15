import { useQuery } from "@tanstack/react-query";
import type { LoanWithBorrowers } from "@/lib/loan-display";

export function useLoanQuery(loanId: string) {
  return useQuery<LoanWithBorrowers>({
    queryKey: ["/api/loans", loanId],
  });
}
