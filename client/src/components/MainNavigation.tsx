import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { FiGrid, FiDollarSign, FiBookmark, FiTrendingUp, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useLeaveLoan } from "@/hooks/use-leave-loan";
import logo from "@assets/r1-icon-color_1794259898751.png";
import "@/styles/main-navigation.css";

const NavigationLayoutContext = createContext<{ expanded: boolean; toggle: () => void } | null>(null);

/** Local layout preference only; the inherited width coordinates fixed and flowing content. */
export function MainNavigationLayout({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  return <NavigationLayoutContext.Provider value={{ expanded, toggle: () => setExpanded(value => !value) }}>
    <div className={`roads-navigation-layout ${className}`} data-navigation-expanded={expanded}>{children}</div>
  </NavigationLayoutContext.Provider>;
}

export function MainNavigation({ loanActive = false }: { loanActive?: boolean }) {
  const layout = useContext(NavigationLayoutContext);
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = layout?.expanded ?? localExpanded;
  const toggle = layout?.toggle ?? (() => setLocalExpanded(value => !value));
  const { leave, leaving, error } = useLeaveLoan();
  return <>
    <nav className={`roads-main-nav${expanded ? " roads-main-nav-expanded" : ""}${loanActive ? " roads-main-nav-loan" : ""}`} aria-label="Main navigation" data-testid="main-navigation" data-expanded={expanded}
      style={!layout ? { width: expanded ? 224 : 80 } : undefined}>
      <div className="roads-main-nav-brand">{expanded ? <span className="roads-main-nav-wordmark headline-300" data-testid="main-nav-wordmark">ROADS</span> : <img className="roads-main-nav-logo" src={logo} alt="Rural 1st" />}</div>
      <button type="button" className="roads-main-nav-toggle" data-testid="button-toggle-navigation" aria-label={expanded ? "Collapse navigation" : "Expand navigation"} aria-expanded={expanded} onClick={toggle}>
        {expanded ? <FiChevronLeft aria-hidden /> : <FiChevronRight aria-hidden />}
      </button>
      <button disabled data-testid="main-nav-dashboard" aria-label="Dashboard — unavailable in this prototype" title="Dashboard — unavailable in this prototype"><FiGrid aria-hidden />{expanded && <span className="roads-main-nav-label body-200">Dashboard</span>}</button>
      <Link href="~/pipeline" aria-label="Pipeline" title="Pipeline" aria-current="page" aria-disabled={leaving}
        data-testid="main-nav-pipeline" onClick={loanActive ? event => { event.preventDefault(); void leave(); } : undefined}><FiDollarSign aria-hidden />{expanded && <span className="roads-main-nav-label body-200">Pipeline</span>}</Link>
      <button disabled data-testid="main-nav-saved-items" aria-label="Saved items — unavailable in this prototype" title="Saved items — unavailable in this prototype"><FiBookmark aria-hidden />{expanded && <span className="roads-main-nav-label body-200">Saved items</span>}</button>
      <button disabled data-testid="main-nav-reports" aria-label="Reports — unavailable in this prototype" title="Reports — unavailable in this prototype"><FiTrendingUp aria-hidden />{expanded && <span className="roads-main-nav-label body-200">Reports</span>}</button>
    </nav>
    {error && <p role="alert" className={`roads-main-nav-error body-200${loanActive ? " roads-main-nav-error-loan" : ""}`}>{error}</p>}
  </>;
}
