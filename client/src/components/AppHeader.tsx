import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Menu, ChevronRight, MessageSquare, PanelRight, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GitHubSyncPanel } from "@/components/GitHubSyncPanel";
import { SummaryDebugDialog } from "@/components/loan/SummaryDebugDialog";
import { useLeaveLoan } from "@/hooks/use-leave-loan";

interface BreadcrumbBarProps {
  loanNumber?: string;
  activityPanelOpen?: boolean;
  toggleActivityPanel?: () => void;
}

export function BreadcrumbBar({ loanNumber, activityPanelOpen, toggleActivityPanel }: BreadcrumbBarProps) {
  const loanActive = loanNumber !== undefined;
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const { leave, leaving, error } = useLeaveLoan();
  return <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding: "0 24px" }} data-testid="breadcrumb-bar">
    <div className="flex items-center body-100" style={{ color: "var(--roads-text-primary)", gap: "var(--roads-spacing-component-2xs)" }}>
      <button data-testid="button-menu" className="flex items-center justify-center" style={{ color: "var(--roads-icon-dark)" }}><Menu className="w-5 h-5" /></button>
      <Link href="~/pipeline" data-testid="breadcrumb-pipeline" aria-disabled={leaving}
        style={{ marginLeft: "var(--roads-spacing-component-xs)" }}
        onClick={loanActive ? event => { event.preventDefault(); void leave(); } : undefined}>Pipeline</Link>
      {loanActive && <><ChevronRight className="w-5 h-5" /><span data-testid="breadcrumb-loan">Loan: {loanNumber}</span></>}
    </div>
    <div className="flex items-center flex-wrap" style={{ gap: "var(--roads-spacing-component-l)" }}>
      <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
        <span className="caption-100-strong" style={{ color: "var(--roads-text-primary)" }}>Viewing</span>
        <Avatar className="w-5 h-5"><AvatarFallback className="caption-100" style={{ backgroundColor: "var(--roads-bg-dark)", color: "var(--roads-text-primary)", fontSize: "10px" }}>RD</AvatarFallback></Avatar>
      </div>
      {loanActive && <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
        <span className="caption-100-strong" style={{ color: "var(--roads-text-primary)" }}>Loan Team</span>
        <div className="flex -space-x-2.5 items-center" data-testid="avatar-group-loan-team">
          {["A1", "B2", "C3"].map((initials, i) => <Avatar key={i} className="w-5 h-5 border" style={{ borderColor: "var(--roads-border-reverse)" }}>
            <AvatarFallback style={{ backgroundColor: "var(--roads-bg-brand-subtle)", color: "var(--roads-text-brand)", fontSize: "9px" }}>{initials}</AvatarFallback>
          </Avatar>)}
          <span className="caption-100" style={{ color: "var(--roads-text-link)", paddingLeft: "var(--roads-spacing-component-2xs)" }} data-testid="text-avatar-overflow">+3</span>
        </div>
      </div>}
      <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
        {loanActive && <>
          <button data-testid="button-messages" className="flex items-center justify-center" style={{ color: "var(--roads-icon-dark)" }}><MessageSquare className="w-5 h-5" /></button>
          <button data-testid="button-sidebar-toggle" className="flex items-center justify-center" onClick={toggleActivityPanel} style={{ color: activityPanelOpen ? "var(--roads-text-brand)" : "var(--roads-icon-dark)" }}><PanelRight className="w-5 h-5" /></button>
        </>}
        <MoreOptionsMenu onGitHubSync={() => setSyncPanelOpen(true)} loanActive={loanActive} />
      </div>
    </div>
    {error && <p role="alert" className="body-200 w-full" style={{ color: "var(--roads-text-error)" }} data-testid="leave-loan-error">{error}</p>}
    <GitHubSyncPanel open={syncPanelOpen} onOpenChange={setSyncPanelOpen} loanActive={loanActive} />
  </div>;
}

export function MoreOptionsMenu({ onGitHubSync, loanActive }: { onGitHubSync: () => void; loanActive: boolean }) {
  const [open, setOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  return <div className="relative" ref={menuRef}>
    <button data-testid="button-more-options" aria-label="More options" aria-expanded={open} className="flex items-center justify-center" style={{ color: "var(--roads-icon-dark)" }} onClick={() => setOpen(value => !value)}><MoreVertical className="w-5 h-5" /></button>
    <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--roads-bg-primary)", borderRadius: "var(--roads-radius-2xs, 4px)", boxShadow: "0px 8px 16px rgba(39, 51, 51, 0.24)", padding: "var(--roads-spacing-component-xs, 8px)", zIndex: 50, visibility: open ? "visible" : "hidden", opacity: open ? 1 : 0 }}>
      <button data-testid="menu-item-prototype-admin" className="body-100"
        style={{ display: "flex", alignItems: "center", width: "100%", height: 40, padding: "0 12px", color: "var(--roads-text-primary)", background: "transparent", borderRadius: "var(--roads-radius-2xs, 4px)", cursor: "pointer", whiteSpace: "nowrap", border: "none" }}
        onMouseEnter={event => { event.currentTarget.style.background = "var(--roads-bg-light, #f9f9f9)"; }}
        onMouseLeave={event => { event.currentTarget.style.background = "transparent"; }}
        onClick={() => { setOpen(false); onGitHubSync(); }}>Prototype Admin Controls</button>
      {loanActive && <button data-testid="menu-item-debug" className="body-100 w-full text-left rounded hover:bg-muted" style={{ height: 40, padding: "0 12px", color: "var(--roads-text-primary)" }} onClick={() => { setOpen(false); setDebugOpen(true); }}>Debug</button>}
    </div>
    {loanActive && <SummaryDebugDialog open={debugOpen} onOpenChange={setDebugOpen} />}
  </div>;
}

export function AppHeader() {
  return <header style={{ paddingTop: "var(--roads-spacing-component-l)", paddingBottom: "var(--roads-spacing-component-l)", borderBottom: "1px solid var(--roads-border-subtle)" }}><BreadcrumbBar /></header>;
}
