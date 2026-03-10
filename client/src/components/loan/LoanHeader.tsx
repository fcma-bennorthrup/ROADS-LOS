import { useState } from "react";
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

const STAGES = [
  { label: "Customer Application", status: "completed" },
  { label: "Pre-Approval", status: "completed" },
  { label: "Processing", status: "active" },
  { label: "Underwriting", status: "upcoming" },
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
  "Compliance",
] as const;

const TOOLBAR_ITEMS = [
  { label: "Loan Info", icon: Percent },
  { label: "Quick Links", icon: Link2 },
  { label: "Checklist", icon: ListChecks },
  { label: "Calendar", icon: Calendar },
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

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div
      className="w-full border-b"
      style={{ borderColor: "var(--roads-border-subtle)" }}
      data-testid="loan-header"
    >
      <div
        className="flex flex-col"
        style={{ gap: "var(--roads-spacing-component-l)" }}
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
      <BottomToolbar />
    </div>
  );
}

function BreadcrumbBar({ loanNumber }: { loanNumber: string }) {
  return (
    <div
      className="flex items-center justify-between flex-wrap gap-2"
      style={{ padding: "var(--roads-spacing-component-xs) var(--roads-spacing-layout-xs)" }}
      data-testid="breadcrumb-bar"
    >
      <div className="flex items-center gap-2 caption-100" style={{ color: "var(--roads-text-secondary)" }}>
        <button data-testid="button-menu" className="flex items-center justify-center" style={{ color: "var(--roads-icon-dark)" }}>
          <Menu className="w-5 h-5" />
        </button>
        <span data-testid="breadcrumb-pipeline">Pipeline</span>
        <ChevronRight className="w-4 h-4" />
        <span data-testid="breadcrumb-loan">Loan: {loanNumber}</span>
        <ChevronRight className="w-4 h-4" />
        <span data-testid="breadcrumb-level">Level Three</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="caption-100" style={{ color: "var(--roads-text-secondary)" }}>Viewing</span>
          <Avatar className="w-6 h-6">
            <AvatarFallback
              className="text-caption-100-strong"
              style={{ backgroundColor: "var(--roads-bg-brand-subtle)", color: "var(--roads-text-brand)", fontSize: "10px" }}
            >
              RD
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex items-center gap-2">
          <span className="caption-100" style={{ color: "var(--roads-text-secondary)" }}>Loan Team</span>
          <div className="flex -space-x-1.5" data-testid="avatar-group-loan-team">
            {["A1", "B2", "C3"].map((initials, i) => (
              <Avatar key={i} className="w-6 h-6 border" style={{ borderColor: "var(--roads-border-reverse)" }}>
                <AvatarFallback
                  style={{ backgroundColor: "var(--roads-bg-brand-subtle)", color: "var(--roads-text-brand)", fontSize: "10px" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            ))}
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full border"
              style={{
                backgroundColor: "var(--roads-bg-dark)",
                borderColor: "var(--roads-border-reverse)",
                color: "var(--roads-text-secondary)",
                fontSize: "10px",
                fontWeight: 600,
              }}
              data-testid="text-avatar-overflow"
            >
              +3
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button data-testid="button-messages" className="flex items-center justify-center p-1" style={{ color: "var(--roads-icon-dark)" }}>
            <MessageSquare className="w-5 h-5" />
          </button>
          <button data-testid="button-sidebar-toggle" className="flex items-center justify-center p-1" style={{ color: "var(--roads-icon-dark)" }}>
            <PanelRight className="w-5 h-5" />
          </button>
          <button data-testid="button-more-options" className="flex items-center justify-center p-1" style={{ color: "var(--roads-icon-dark)" }}>
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StageStepper() {
  return (
    <div
      className="flex items-stretch w-full overflow-x-auto"
      style={{ padding: "0 var(--roads-spacing-layout-xs)" }}
      data-testid="stage-stepper"
    >
      {STAGES.map((stage, index) => {
        const isCompleted = stage.status === "completed";
        const isActive = stage.status === "active";
        const isLast = index === STAGES.length - 1;

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
          textColor = "var(--roads-text-primary)";
        }

        return (
          <div
            key={stage.label}
            className="flex items-stretch flex-1 min-w-0"
            data-testid={`stage-${stage.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div
              className="flex items-center justify-center gap-1.5 flex-1 relative caption-100-strong"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-m)",
                borderRadius: index === 0 ? "var(--roads-radius-2xs) 0 0 var(--roads-radius-2xs)" : isLast ? "0 var(--roads-radius-2xs) var(--roads-radius-2xs) 0" : "0",
              }}
            >
              {isCompleted && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="truncate">{stage.label}</span>
            </div>
            {!isLast && (
              <div
                className="flex items-center"
                style={{ color: bgColor }}
              >
                <svg width="12" height="100%" viewBox="0 0 12 32" preserveAspectRatio="none" className="h-full">
                  <polygon points="0,0 12,16 0,32" fill="currentColor" />
                </svg>
              </div>
            )}
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
      style={{ padding: "0 var(--roads-spacing-layout-xs)", gap: "var(--roads-spacing-component-xs)" }}
    >
      <div className="flex items-center gap-2 caption-100" style={{ color: "var(--roads-text-secondary)" }} data-testid="text-loan-metadata">
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

      <div className="flex items-center flex-wrap gap-2" data-testid="text-loan-amount-chips">
        <span
          className="headline-300"
          style={{ color: "var(--roads-text-primary)" }}
          data-testid="text-loan-amount"
        >
          {amount}
        </span>

        <span
          className="caption-100-strong inline-flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-brand-subtle)",
            color: "var(--roads-text-brand)",
            padding: "var(--roads-spacing-component-2xs) var(--roads-spacing-component-xs)",
            borderRadius: "var(--roads-radius-2xs)",
          }}
          data-testid="chip-application-type"
        >
          {applicationType}
        </span>

        <span style={{ color: "var(--roads-border-subtle)" }}>|</span>

        <span
          className="caption-100-strong inline-flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-warning-subtle)",
            color: "var(--roads-text-warning)",
            padding: "var(--roads-spacing-component-2xs) var(--roads-spacing-component-xs)",
            borderRadius: "var(--roads-radius-2xs)",
          }}
          data-testid="chip-ecoa-days"
        >
          {ecoaDaysRemaining} ECOA Days Remaining
        </span>

        <span
          className="caption-100-strong inline-flex items-center"
          style={{
            backgroundColor: "var(--roads-bg-error-subtle)",
            color: "var(--roads-text-error)",
            padding: "var(--roads-spacing-component-2xs) var(--roads-spacing-component-xs)",
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
      style={{ padding: "0 var(--roads-spacing-layout-xs)" }}
      data-testid="tab-navigation"
    >
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="body-200-strong whitespace-nowrap"
            style={{
              padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
              color: isActive ? "var(--roads-text-brand)" : "var(--roads-text-secondary)",
              borderBottom: isActive ? "2px solid var(--roads-border-brand)" : "2px solid transparent",
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

function BottomToolbar() {
  return (
    <div
      className="flex items-center overflow-x-auto"
      style={{
        padding: "var(--roads-spacing-component-2xs) var(--roads-spacing-layout-xs)",
        gap: "var(--roads-spacing-component-l)",
        borderTop: "1px solid var(--roads-border-subtle)",
      }}
      data-testid="bottom-toolbar"
    >
      {TOOLBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            className="flex items-center gap-1 caption-100 whitespace-nowrap relative"
            style={{ color: "var(--roads-text-secondary)" }}
            data-testid={`toolbar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
            {"hasIndicator" in item && item.hasIndicator && (
              <span
                className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full"
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

export default LoanHeader;
