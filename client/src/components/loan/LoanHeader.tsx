import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Check,
  Percent,
  Link2,
  ListChecks,
  Calendar,
  AlertTriangle,
  Slash,
} from "lucide-react";
import { BreadcrumbBar } from "@/components/AppHeader";
import { ChecklistPanel } from "@/components/loan/ChecklistPanel";
import { useActivityPanel } from "@/contexts/loan-activity-context";
import { useChecklist } from "@/contexts/checklist-context";
import { applicationStore } from "@/lib/loan-application-store";
import { useApplicationStatus } from "@/contexts/loan-application-context";
import { useLoanId } from "@/contexts/loan-id-context";
import { LOAN_STAGES } from "@shared/loan-stages";

const STAGES = LOAN_STAGES
  .filter(label => label !== "Pre-Approval" && label !== "Loan Setup")
  .map(label => ({ label }));

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
  const [, navigate] = useLocation();
  const loanId = useLoanId();
  const { activityPanelOpen, toggleActivityPanel } = useActivityPanel();
  const { tasks } = useChecklist();
  const app = useApplicationStatus().document;
  const withdrawn = (app?.sections.withdrawal as { acknowledged?: boolean } | undefined)?.acknowledged === true;
  const showTridDaysRemaining = app
    ? app.businessRules?.trid.status === "required"
    : tasks.find((task) => task.name === "Loan Estimate")?.status === "re-fire";

  const handleTabClick = (tab: string) => {
    onTabChange?.(tab);
    const route = TAB_ROUTES[tab];
    if (route) {
      navigate(`~${route.replace(":id", loanId)}`);
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
        <BreadcrumbBar loanNumber={loanNumber} activityPanelOpen={activityPanelOpen} toggleActivityPanel={toggleActivityPanel} />
        <StageStepper key={`${app?.loan.id ?? loanNumber}:${app?.generation ?? 0}`} />
        <HeaderTextBlock
          withdrawn={withdrawn}
          loanType={loanType}
          loanNumber={loanNumber}
          cifNumber={cifNumber}
          borrowerName={borrowerName}
          amount={amount}
          applicationType={app ? app.businessRules?.jointCredit?.showChip ? "Joint Credit Application" : "" : applicationType}
          ecoaDaysRemaining={ecoaDaysRemaining}
          showEcoaDaysRemaining={app ? app.businessRules?.ecoa?.status === "required" : true}
          tridDaysRemaining={tridDaysRemaining}
          showTridDaysRemaining={showTridDaysRemaining}
        />
        {withdrawn && <div role="status" data-testid="withdrawn-notice"
          className="flex items-start"
          style={{ margin: "0 24px", padding: "12px 16px", gap: 12,
            backgroundColor: "var(--roads-bg-light)", border: "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-2xs)", color: "var(--roads-text-primary)" }}>
          <Slash size={18} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="body-200-strong">This loan has been withdrawn.</p>
            <p className="body-200" style={{ color: "var(--roads-text-secondary)" }}>Withdrawn at the borrower’s request.</p>
          </div>
        </div>}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabClick}
        />
      </div>
    </div>
  );
}

export function StageStepper() {
  const store = useApplicationStatus();
  const withdrawn = (store.document?.sections.withdrawal as { acknowledged?: boolean } | undefined)?.acknowledged === true;
  // Older saved stages remain intact; display them at the application step until moved.
  const currentStep = Math.max(0, STAGES.findIndex(stage => stage.label === store.document?.loan.stage));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function move(direction: number) {
    if (busy || store.error || !store.document) return;
    const next = currentStep + direction;
    if (next < 0 || next >= STAGES.length) return;
    setBusy(true); setError("");
    try { await applicationStore.changeStage(STAGES[next].label); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <>
    {withdrawn && <p className="caption-100" style={{ padding: "0 24px", color: "var(--roads-text-secondary)" }}
      data-testid="withdrawn-stage-label">Stage at withdrawal: {store.document?.loan.stage}</p>}
    <div
      className="flex w-full"
      style={{ padding: "0 24px" }}
      data-testid="stage-stepper"
    >
      {STAGES.map((stage, index) => {
        const isLast = index === STAGES.length - 1;
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isControl = index === 0 || isLast;
        const Stage = isControl ? "button" : "div";

        let bgColor: string;
        let textColor: string;
        if (withdrawn) {
          bgColor = isActive ? "var(--roads-bg-dark)" : "var(--roads-bg-light)";
          textColor = isActive ? "var(--roads-text-primary)" : "var(--roads-text-secondary)";
        } else if (isCompleted) {
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
            <Stage
              {...(isControl ? {
                type: "button" as const,
                "aria-label": index === 0 ? "Move loan stage backward" : "Move loan stage forward",
                "aria-disabled": busy || !!store.error || (index === 0 ? currentStep === 0 : currentStep === STAGES.length - 1),
                disabled: busy || !!store.error || (index === 0 ? currentStep === 0 : currentStep === STAGES.length - 1),
                onClick: () => { void move(index === 0 ? -1 : 1); },
              } : {})}
              aria-current={isActive ? "step" : undefined}
              className="flex items-center justify-center w-full h-full caption-100-strong"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                clipPath,
                paddingLeft: 20,
                paddingRight: 20,
                gap: 4,
                ...(isControl ? { border: 0, cursor: "default" } : {}),
              }}
            >
              {isCompleted && <Check className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{stage.label}</span>
            </Stage>
          </div>
        );
      })}
    </div>
    {error && <p role="alert" className="body-200" style={{ padding: "0 24px", color: "var(--roads-text-error)" }}>{error}</p>}
    </>
  );
}

interface HeaderTextBlockProps {
  withdrawn?: boolean;
  loanType: string;
  loanNumber: string;
  cifNumber: string;
  borrowerName: string;
  amount: string;
  applicationType: string;
  ecoaDaysRemaining: number;
  showEcoaDaysRemaining: boolean;
  tridDaysRemaining: number;
  showTridDaysRemaining: boolean;
}

function HeaderTextBlock({
  withdrawn = false,
  loanType,
  loanNumber,
  cifNumber,
  borrowerName,
  amount,
  applicationType,
  ecoaDaysRemaining,
  showEcoaDaysRemaining,
  tridDaysRemaining,
  showTridDaysRemaining,
}: HeaderTextBlockProps) {
  return (
    <div
      className="flex flex-col"
      style={{ padding: "0 24px", gap: "var(--roads-spacing-component-3xs)" }}
    >
      <div className="flex items-center flex-wrap caption-100" style={{ color: "var(--roads-text-primary)", gap: "var(--roads-spacing-component-2xs)" }} data-testid="text-loan-metadata">
        <span>SLP</span>
        <span style={{ color: "var(--roads-border-subtle)" }}>|</span>
        <span>Loan: {loanNumber}</span>
        {withdrawn && <span className="body-200-strong inline-flex items-center" data-testid="chip-withdrawn"
          style={{ marginLeft: 4, gap: 4, padding: "2px 8px", borderRadius: "var(--roads-radius-2xs)",
            backgroundColor: "var(--roads-bg-dark)", color: "var(--roads-icon-dark)" }}>
          <Slash size={14} aria-hidden />Withdrawn
        </span>}
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

        {applicationType && <span
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
        </span>}

        <span style={{ color: "var(--roads-border-subtle)", height: "24px", display: "inline-flex", alignItems: "center" }}>|</span>

        {showEcoaDaysRemaining && <span
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
          30 ECOA days remaining
        </span>}

        {showTridDaysRemaining && (
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
            TRID day 0
          </span>
        )}
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
  const [checklistOpen, setChecklistOpen] = useState(false);
  const checklistBtnRef = useRef<HTMLButtonElement>(null);
  const toolbarWrapperRef = useRef<HTMLDivElement>(null);
  const [panelCenterX, setPanelCenterX] = useState<number | null>(null);

  useEffect(() => {
    if (checklistOpen && checklistBtnRef.current && toolbarWrapperRef.current) {
      const btn = checklistBtnRef.current.getBoundingClientRect();
      const wrapper = toolbarWrapperRef.current.getBoundingClientRect();
      setPanelCenterX(btn.left - wrapper.left + btn.width / 2);
    }
  }, [checklistOpen]);

  return (
    <div className="relative" ref={toolbarWrapperRef}>
      {/* Panel renders here — outside the overflow-x:auto toolbar div — to avoid clipping */}
      {checklistOpen && panelCenterX !== null && (
        <ChecklistPanel
          onClose={() => setChecklistOpen(false)}
          centerX={panelCenterX}
        />
      )}
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
          const isChecklist = item.label === "Checklist";
          return (
            <button
              key={item.label}
              ref={isChecklist ? checklistBtnRef : undefined}
              className="flex items-center caption-100 whitespace-nowrap"
              onClick={isChecklist ? () => setChecklistOpen((v) => !v) : undefined}
              style={{
                color:
                  isChecklist && checklistOpen
                    ? "var(--roads-text-brand)"
                    : "var(--roads-text-primary)",
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
    </div>
  );
}

export default LoanHeader;
