import { Link } from "wouter";
import { FiGrid, FiDollarSign, FiBookmark, FiTrendingUp } from "react-icons/fi";
import { useLeaveLoan } from "@/hooks/use-leave-loan";
import logo from "@assets/r1-icon-color_1794259898751.png";
import "@/styles/main-navigation.css";

export function MainNavigation({ loanActive = false }: { loanActive?: boolean }) {
  const { leave, leaving, error } = useLeaveLoan();
  return <>
    <nav className={`roads-main-nav${loanActive ? " roads-main-nav-loan" : ""}`} aria-label="Main navigation">
      <img className="roads-main-nav-logo" src={logo} alt="Rural 1st" />
      <button disabled aria-label="Dashboard — unavailable in this prototype" title="Dashboard — unavailable in this prototype"><FiGrid aria-hidden /></button>
      <Link href="~/pipeline" aria-label="Pipeline" title="Pipeline" aria-current="page" aria-disabled={leaving}
        data-testid="main-nav-pipeline" onClick={loanActive ? event => { event.preventDefault(); void leave(); } : undefined}><FiDollarSign aria-hidden /></Link>
      <button disabled aria-label="Saved items — unavailable in this prototype" title="Saved items — unavailable in this prototype"><FiBookmark aria-hidden /></button>
      <button disabled aria-label="Reports — unavailable in this prototype" title="Reports — unavailable in this prototype"><FiTrendingUp aria-hidden /></button>
    </nav>
    {error && <p role="alert" className="roads-main-nav-error body-200">{error}</p>}
  </>;
}
