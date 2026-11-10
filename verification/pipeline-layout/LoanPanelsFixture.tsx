import { LoanIdProvider } from "@/contexts/loan-id-context";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { LoanHeader, BottomToolbar } from "@/components/loan/LoanHeader";
import { LoanActivityPanel } from "@/components/loan/LoanActivityPanel";

/** Real panel state, but no application loader, installed loan, or save endpoint. */
export function LoanPanelsFixture() {
  return <LoanIdProvider id="overlay-fixture">
    <ChecklistProvider><LoanActivityProvider>
      <div className="roads-loan-shell h-screen min-h-[100dvh] flex flex-row overflow-hidden" data-testid="loan-panels-fixture">
        <div className="flex flex-col flex-1 min-w-0">
          <LoanHeader loanNumber="100000001" borrowerName="Synthetic borrower" />
          <main className="flex-1 overflow-y-auto">
            <input aria-label="Unsaved example" defaultValue="Unchanged draft" />
          </main>
          <div className="roads-loan-bottom-toolbar"><BottomToolbar /></div>
        </div>
        <LoanActivityPanel />
      </div>
    </LoanActivityProvider></ChecklistProvider>
  </LoanIdProvider>;
}
