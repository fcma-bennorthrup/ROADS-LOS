import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Menu,
  ChevronRight,
  MessageSquare,
  PanelRight,
  MoreVertical,
  Check,
  Percent,
  Link2,
  ListChecks,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GitHubSyncPanel } from "@/components/GitHubSyncPanel";

const STAGES = [
  { label: "Customer Application", status: "completed" },
  { label: "Pre-Approval", status: "completed" },
  { label: "Loan Setup", status: "active" },
  { label: "Decisioning", status: "upcoming" },
  { label: "Loan Finalization", status: "upcoming" },
  { label: "Closing", status: "upcoming" },
  { label: "Booking", status: "upcoming" },
  { label: "Loan Certification", status: "upcoming" },
] as const;

const TABS = [
  "Summary",
  "Origination",
  "Decisioning",
  "Closing & Booking",
  "Documents",
  "History",
] as const;

const TOOLBAR_ITEMS = [
  { label: "Loan Info", icon: Percent },
  { label: "Quick Links", icon: Link2 },
  { label: "Checklist", icon: ListChecks },
  { label: "Key Dates", icon: Calendar },
  { label: "Errors", icon: AlertTriangle, hasIndicator: true },
] as const;

interface LoanHeaderProps {
  loanNumber?: string;
  cifNumber?: string;
  loanType?: string;
  borrowerName?: string;
  amount?: string;
  applicationType?: string;
  ecoaDaysRemaining?: number;
  tridDaysRemaining?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const TAB_ROUTES: Record<string, string> = {
  Summary: "/loans/:id",
  Origination: "/loans/:id/origination",
  Decisioning: "/loans/:id/decisioning",
  "Closing & Booking": "/loans/:id/closing-booking",
  Documents: "/loans/:id/documents",
  History: "/loans/:id/history",
};

export function LoanHeader({
  loanNumber = "123456789",
  cifNumber = "1234567",
  loanType = "Construction",
  borrowerName = "Richard Jamerson",
  amount = "$150,000.00",
  applicationType = "Joint Credit Application",
  ecoaDaysRemaining = 14,
  tridDaysRemaining = 3,
  activeTab = "Summary",
  onTabChange,
}: LoanHeaderProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [, navigate] = useLocation();

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
    const route = TAB_ROUTES[tab];
    if (route) {
      const loanMatch = window.location.pathname.match(/\/loans\/([^/]+)/);
      const id = loanMatch ? loanMatch[1] : "1";
      navigate(route.replace(":id", id));
    }
  };

  return (
    <div
      className="w-full"
      style={{ borderBottom: "1px solid var(--roads-border-subtle)" }}
      data-testid="loan-header"
    >
      <div
        className="flex flex-col"
        style={{ gap: "16px", paddingTop: "16px" }}
      >
        <BreadcrumbBar loanNumber={loanNumber} />
        <StageStepper />
        <HeaderTextBlock
          loanType={loanType}
          loanNumber={loanNumber}
          cifNumber={cifNumber}
          borrowerName={borrowerName}
          amount={amount}
          applicationType={applicationType}
          ecoaDaysRemaining={ecoaDaysRemaining}
          tridDaysRemaining={tridDaysRemaining}
        />
        <TabNavigation
          activeTab={currentTab}
          onTabChange={handleTabClick}
        />
      </div>
    </div>
  );
}

function BreadcrumbBar({ loanNumber }: { loanNumber: string }) {
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  return (
    <div
      className="flex items-center justify-between flex-wrap gap-2"
      style={{ padding: "0 24px" }}
      data-testid="breadcrumb-bar"
    >
      <div className="flex items-center body-100" style={{ color: "var(--roads-text-primary)", gap: "var(--roads-spacing-component-2xs)" }}>
        <button data-testid="button-menu" className="flex items-center justify-center" style={{ color: "var(--roads-icon-dark)" }}>
          <Menu className="w-5 h-5" />
        </button>
        <span data-testid="breadcrumb-pipeline" style={{ marginLeft: "var(--roads-spacing-component-xs)" }}>Pipeline</span>
        <ChevronRight className="w-5 h-5" />
        <span data-testid="breadcrumb-loan">Loan: {loanNumber}</span>
        <ChevronRight className="w-5 h-5" />
        <span data-testid="breadcrumb-level">Level Three</span>
      </div>

      <div className="flex items-center flex-wrap" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <span className="caption-100-strong" style={{ color: "var(--roads-text-primary)" }}>Viewing</span>
          <Avatar className="w-5 h-5">
            <AvatarFallback
              className="caption-100"
              style={{ backgroundColor: "var(--roads-bg-dark)", color: "var(--roads-text-primary)", fontSize: "10px" }}
            >
              RD
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <span className="caption-100-strong" style={{ color: "var(--roads-text-primary)" }}>Loan Team</span>
          <div className="flex -space-x-2.5 items-center" data-testid="avatar-group-loan-team">
            {["A1", "B2", "C3"].map((initials, i) => (
              <Avatar key={i} className="w-5 h-5 border" style={{ borderColor: "var(--roads-border-reverse)" }}>
                <AvatarFallback
                  style={{ backgroundColor: "var(--roads-bg-brand-subtle)", color: "var(--roads-text-brand)", fontSize: "9px" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            ))}
            <span
              className="caption-100"
              style={{
                color: "var(--roads-text-link)",
                paddingLeft: "var(--roads-spacing-component-2xs)",
              }}
              data-testid="text-avatar-overflow"
            >
              +3
            </span>
          </div>
        </div>

        <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
          <button data-testid="button-messages" className="flex items-center justify-center" style={{ color: "var(--roads-icon-dark)" }}>
            <MessageSquare className="w-5 h-5" />
          </button>
          <button data-testid="button-sidebar-toggle" className="flex items-center justify-center" style={{ color: "var(--roads-icon-dark)" }}>
            <PanelRight className="w-5 h-5" />
          </button>
          <MoreOptionsMenu
            onGitHubSync={() => setSyncPanelOpen(true)}
          />
        </div>
      </div>
      <GitHubSyncPanel open={syncPanelOpen} onOpenChange={setSyncPanelOpen} />
    </div>
  );
}

function StageStepper({ currentStep = 2 }: { currentStep?: number }) {
  return (
    <div
      className="flex w-full"
      style={{ padding: "0 24px" }}
      data-testid="stage-stepper"
    >
      {STAGES.map((stage, index) => {
        const isLast = index === STAGES.length - 1;
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        let bgColor: string;
        let textColor: string;
        if (isCompleted) {
          bgColor = "var(--roads-bg-brand-subtle)";
          textColor = "var(--roads-text-brand)";
        } else if (isActive) {
          bgColor = "var(--roads-bg-brand)";
          textColor = "var(--roads-text-reverse)";
        } else {
          bgColor = "var(--roads-bg-dark)";
          textColor = "var(--roads-text-secondary)";
        }

        const clipPath = "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";

        return (
          <div
            key={stage.label}
            style={{
              flex: 1,
              marginRight: isLast ? 0 : -8,
              position: "relative",
              zIndex: index + 1,
              height: 28,
            }}
            data-testid={`stage-${stage.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div
              className="flex items-center justify-center w-full h-full caption-100-strong"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                clipPath,
                paddingLeft: 20,
                paddingRight: 20,
                gap: 4,
              }}
            >
              {isCompleted && <Check className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{stage.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface HeaderTextBlockProps {
  loanType: string;
  loanNumber: string;
  cifNumber: string;
  borrowerName: string;
  amount: string;
  applicationType: string;
  ecoaDaysRemaining: number;
  tridDaysRemaining: number;
}

function HeaderTextBlock({
  loanType,
  loanNumber,
  cifNumber,
  borrowerName,
  amount,
  applicationType,
  ecoaDaysRemaining,
  tridDaysRemaining,
}: HeaderTextBlockProps) {
  return (
    <div
      className="flex flex-col"
      style={{ padding: "0 24px", gap: "var(--roads-spacing-component-3xs)" }}
    >
      <div className="flex items-center caption-100" style={{ color: "var(--roads-text-primary)", gap: "var(--roads-spacing-component-2xs)" }} data-testid="text-loan-metadata">
        <span>{loanType}</span>
        <span style={{ color: "var(--roads-border-subtle)" }}>|</span>
        <span>Loan: {loanNumber}</span>
        <span style={{ color: "var(--roads-border-subtle)" }}>|</span>
        <span>CIF: {cifNumber}</span>
      </div>

      <h1
        className="headline-100"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="text-borrower-name"
      >
        {borrowerName}
      </h1>

      <div className="flex items-center flex-wrap" style={{ gap: "var(--roads-spacing-component-xs)" }} data-testid="text-loan-amount-chips">
        <span
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="text-loan-amount"
        >
          {amount}
        </span>

        <span
          className="body-200-strong inline-flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-brand-subtle)",
            color: "var(--roads-text-brand)",
            height: "20px",
            padding: "0 var(--roads-spacing-component-xs)",
            borderRadius: "var(--roads-radius-2xs)",
          }}
          data-testid="chip-application-type"
        >
          {applicationType}
        </span>

        <span style={{ color: "var(--roads-border-subtle)", height: "24px", display: "inline-flex", alignItems: "center" }}>|</span>

        <span
          className="body-200-strong inline-flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-warning-subtle)",
            color: "var(--roads-text-warning)",
            height: "20px",
            padding: "0 var(--roads-spacing-component-xs)",
            borderRadius: "var(--roads-radius-2xs)",
          }}
          data-testid="chip-ecoa-days"
        >
          {ecoaDaysRemaining} ECOA Days Remaining
        </span>

        <span
          className="body-200-strong inline-flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-error-subtle)",
            color: "var(--roads-text-error)",
            height: "20px",
            padding: "0 var(--roads-spacing-component-xs)",
            borderRadius: "var(--roads-radius-2xs)",
          }}
          data-testid="chip-trid-days"
        >
          {tridDaysRemaining} TRID Days Remaining
        </span>
      </div>
    </div>
  );
}

function TabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div
      className="flex items-end overflow-x-auto"
      style={{ padding: "0 24px" }}
      data-testid="tab-navigation"
    >
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="label-strong whitespace-nowrap"
            style={{
              padding: "0 var(--roads-spacing-component-xl)",
              height: "48px",
              display: "flex",
              alignItems: "center",
              color: isActive ? "var(--roads-text-brand)" : "var(--roads-text-primary)",
              borderBottom: isActive
                ? "2px solid var(--roads-border-brand)"
                : "2px solid transparent",
            }}
            data-testid={`tab-${tab.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

export function BottomToolbar() {
  return (
    <div
      className="flex items-center overflow-x-auto justify-center"
      style={{
        padding: "0 var(--roads-spacing-component-l)",
        gap: "var(--roads-spacing-component-xl)",
        borderTop: "1px solid var(--roads-border-subtle)",
        backgroundColor: "var(--roads-bg-primary)",
        height: "36px",
      }}
      data-testid="bottom-toolbar"
    >
      {TOOLBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            className="flex items-center caption-100 whitespace-nowrap relative"
            style={{
              color: "var(--roads-text-primary)",
              gap: "var(--roads-spacing-component-2xs)",
              padding: "0 var(--roads-spacing-component-l)",
              height: "100%",
            }}
            data-testid={`toolbar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
            {"hasIndicator" in item && item.hasIndicator && (
              <span
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: "var(--roads-bg-error)" }}
                data-testid="indicator-errors"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function MoreOptionsMenu({ onGitHubSync }: { onGitHubSync: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        data-testid="button-more-options"
        className="flex items-center justify-center"
        style={{ color: "var(--roads-icon-dark)" }}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          right: 0,
          background: "var(--roads-bg-primary)",
          borderRadius: "var(--roads-radius-2xs, 4px)",
          boxShadow: "0px 8px 16px rgba(39, 51, 51, 0.24)",
          padding: "var(--roads-spacing-component-xs, 8px)",
          zIndex: 50,
          visibility: open ? "visible" : "hidden",
          opacity: open ? 1 : 0,
        }}
      >
        <button
          data-testid="menu-item-prototype-admin"
          className="body-100"
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            height: 40,
            padding: "0 12px",
            color: "var(--roads-text-primary)",
            background: "transparent",
            borderRadius: "var(--roads-radius-2xs, 4px)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            border: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--roads-bg-light, #f9f9f9)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
          onClick={() => {
            setOpen(false);
            onGitHubSync();
          }}
        >
          Prototype Admin Controls
        </button>
      </div>
    </div>
  );
}

export default LoanHeader;
