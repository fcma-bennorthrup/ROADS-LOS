import type { ReactNode } from "react";
import { useParams } from "wouter";
import { LoanIdProvider } from "@/contexts/loan-id-context";
import { LoanApplicationProvider } from "@/contexts/loan-application-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { ChecklistProvider } from "@/contexts/checklist-context";

export function LoanScope({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  if (!id) throw new Error("A loan workspace requires a loan ID.");
  return <LoanIdProvider key={id} id={id}>
    <LoanApplicationProvider><LoanActivityProvider><ChecklistProvider>
      {children}
    </ChecklistProvider></LoanActivityProvider></LoanApplicationProvider>
  </LoanIdProvider>;
}
