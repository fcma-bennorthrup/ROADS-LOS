import { useState } from "react";
import { Content } from "@radix-ui/react-dialog";
import { FiMenu, FiX, FiDollarSign, FiTrendingUp } from "react-icons/fi";
import { Sheet, SheetTrigger, SheetPortal, SheetOverlay, SheetClose, SheetTitle } from "@/components/ui/sheet";
import { useLeaveLoan } from "@/hooks/use-leave-loan";
import "@/styles/loan-navigation.css";

/** Loan-only trigger and modal. Mount inside the loan router; no layout/provider props needed. */
export function LoanNavigationMenu() {
  const [open, setOpen] = useState(false);
  const { leave, leaving, error } = useLeaveLoan();

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <button type="button" data-testid="button-menu" aria-label="Open loan navigation"
        className="roads-loan-navigation-trigger flex items-center justify-center"
        style={{ color: "var(--roads-icon-dark)" }}>
        <FiMenu className="w-5 h-5" aria-hidden />
      </button>
    </SheetTrigger>
    <SheetPortal>
      <SheetOverlay style={{ backgroundColor: "rgb(0 0 0 / 20%)" }} data-testid="loan-navigation-backdrop" />
      <Content className="roads-loan-navigation-drawer" aria-describedby={undefined} data-testid="loan-navigation-drawer">
        <div className="roads-loan-navigation-header">
          <span className="roads-loan-navigation-brand headline-300">ROADS</span>
          <SheetClose asChild>
            <button type="button" className="roads-loan-navigation-close" aria-label="Close loan navigation">
              <FiX aria-hidden />
            </button>
          </SheetClose>
        </div>
        <SheetTitle className="sr-only">Loan navigation</SheetTitle>
        <nav aria-label="Loan navigation">
          <button type="button" className="roads-loan-navigation-item body-100" disabled={leaving}
            data-testid="loan-nav-pipeline" onClick={() => { void leave(); }}>
            <FiDollarSign aria-hidden /><span>Pipeline</span>
          </button>
          <button type="button" className="roads-loan-navigation-item body-100" disabled
            aria-label="Reports — unavailable in this prototype" title="Reports — unavailable in this prototype"
            data-testid="loan-nav-reports">
            <FiTrendingUp aria-hidden /><span>Reports</span>
          </button>
        </nav>
        {error && <p role="alert" className="roads-loan-navigation-error body-200" data-testid="loan-navigation-error">{error}</p>}
      </Content>
    </SheetPortal>
  </Sheet>;
}
