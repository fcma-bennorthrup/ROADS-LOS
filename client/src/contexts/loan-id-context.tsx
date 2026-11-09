import { createContext, useContext, type ReactNode } from "react";

const LoanIdContext = createContext<string | null>(null);
export function LoanIdProvider({ id, children }: { id: string; children: ReactNode }) {
  return <LoanIdContext.Provider value={id}>{children}</LoanIdContext.Provider>;
}
export function useOptionalLoanId() { return useContext(LoanIdContext); }
export function useLoanId() {
  const id = useOptionalLoanId();
  if (!id) throw new Error("useLoanId must be used inside a loan workspace.");
  return id;
}
