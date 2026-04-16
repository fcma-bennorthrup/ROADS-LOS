import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search } from "lucide-react";
import { RoadsDropdown } from "./RoadsDropdown";

interface ChangeLogEntry {
  id: number;
  field: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
  position: string;
  timestamp: string;
  section: string;
  navItem: string;
}

const SECTION_TO_NAV: Record<string, string> = {
  "Borrower Information": "Borrower Information",
  "Loan Details": "Loan Details",
  "Collateral": "Collateral",
  "Product & Pricing": "Product & Pricing",
  "Fees": "Fees",
  "Decisioning": "Decisioning",
};

const MOCK_CHANGE_LOG: ChangeLogEntry[] = [
  { id: 1, field: "Primary Borrower Name", previousValue: "Richard James", newValue: "Richard Jamerson", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/15/2026 02:34 PM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 2, field: "Pricing Tier", previousValue: "Standard", newValue: "Premium", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/14/2026 11:20 AM", section: "Product & Pricing", navItem: "Product & Pricing" },
  { id: 3, field: "Loan Amount", previousValue: "$125,000.00", newValue: "$150,000.00", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/14/2026 09:15 AM", section: "Loan Details", navItem: "Loan Details" },
  { id: 4, field: "Interest Rate", previousValue: "6.500%", newValue: "7.255%", changedBy: "System", position: "System", timestamp: "03/13/2026 04:00 PM", section: "Product & Pricing", navItem: "Product & Pricing" },
  { id: 5, field: "Appraisal Fee", previousValue: "—", newValue: "$450.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/13/2026 01:45 PM", section: "Fees", navItem: "Fees" },
  { id: 6, field: "Credit Report Fee", previousValue: "—", newValue: "$35.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/13/2026 01:40 PM", section: "Fees", navItem: "Fees" },
  { id: 7, field: "Collateral Address", previousValue: "123 Main St", newValue: "456 Oak Ave", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/12/2026 03:30 PM", section: "Collateral", navItem: "Collateral" },
  { id: 8, field: "Employer Name", previousValue: "Acme Corp", newValue: "Acme Industries", changedBy: "Richard Jamerson", position: "Borrower", timestamp: "03/12/2026 10:00 AM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 9, field: "Monthly Income", previousValue: "$4,500.00", newValue: "$5,200.00", changedBy: "Richard Jamerson", position: "Borrower", timestamp: "03/12/2026 09:55 AM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 10, field: "Loan Type", previousValue: "Conventional", newValue: "Construction", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/11/2026 02:00 PM", section: "Loan Details", navItem: "Loan Details" },
  { id: 11, field: "Application Type", previousValue: "Individual", newValue: "Joint Credit Application", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/11/2026 01:50 PM", section: "Loan Details", navItem: "Loan Details" },
  { id: 12, field: "Co-Borrower", previousValue: "—", newValue: "Jamelle Jamerson", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/11/2026 01:45 PM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 13, field: "Property Type", previousValue: "Condo", newValue: "Single Family", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/10/2026 11:30 AM", section: "Collateral", navItem: "Collateral" },
  { id: 14, field: "Flood Insurance", previousValue: "Not Required", newValue: "Required", changedBy: "System", position: "System", timestamp: "03/10/2026 11:25 AM", section: "Collateral", navItem: "Collateral" },
  { id: 15, field: "Title Insurance Fee", previousValue: "—", newValue: "$1,200.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/10/2026 10:00 AM", section: "Fees", navItem: "Fees" },
  { id: 16, field: "Origination Fee", previousValue: "$1,000.00", newValue: "$1,500.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/09/2026 03:15 PM", section: "Fees", navItem: "Fees" },
  { id: 17, field: "DTI Ratio", previousValue: "28.00%", newValue: "17.00%", changedBy: "System", position: "System", timestamp: "03/09/2026 03:00 PM", section: "Decisioning", navItem: "Decisioning" },
  { id: 18, field: "LTV Ratio", previousValue: "85.00%", newValue: "80.00%", changedBy: "System", position: "System", timestamp: "03/09/2026 02:58 PM", section: "Decisioning", navItem: "Decisioning" },
  { id: 19, field: "Credit Score", previousValue: "720", newValue: "756", changedBy: "System", position: "System", timestamp: "03/08/2026 08:00 AM", section: "Decisioning", navItem: "Decisioning" },
  { id: 20, field: "Checking Account Balance", previousValue: "$10,000.00", newValue: "$25,000.00", changedBy: "Richard Jamerson", position: "Borrower", timestamp: "03/08/2026 07:45 AM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 21, field: "Savings Account Balance", previousValue: "$5,000.00", newValue: "$15,000.00", changedBy: "Richard Jamerson", position: "Borrower", timestamp: "03/08/2026 07:40 AM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 22, field: "Product", previousValue: "4374 - 30 year fixed", newValue: "4370 - 10 year fixed", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/07/2026 04:30 PM", section: "Product & Pricing", navItem: "Product & Pricing" },
  { id: 23, field: "Term (Months)", previousValue: "360", newValue: "120", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/07/2026 04:25 PM", section: "Product & Pricing", navItem: "Product & Pricing" },
  { id: 24, field: "Base Rate", previousValue: "6.750%", newValue: "6.125%", changedBy: "System", position: "System", timestamp: "03/07/2026 04:20 PM", section: "Product & Pricing", navItem: "Product & Pricing" },
  { id: 25, field: "Recording Fee", previousValue: "—", newValue: "$125.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/06/2026 02:00 PM", section: "Fees", navItem: "Fees" },
  { id: 26, field: "Tax Service Fee", previousValue: "—", newValue: "$75.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/06/2026 01:55 PM", section: "Fees", navItem: "Fees" },
  { id: 27, field: "Stage", previousValue: "Application", newValue: "Loan Setup", changedBy: "John Smith", position: "Loan Officer", timestamp: "03/05/2026 09:00 AM", section: "Loan Details", navItem: "Loan Details" },
  { id: 28, field: "Underwriting Fee", previousValue: "—", newValue: "$500.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/05/2026 08:30 AM", section: "Fees", navItem: "Fees" },
  { id: 29, field: "Processing Fee", previousValue: "—", newValue: "$350.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/05/2026 08:25 AM", section: "Fees", navItem: "Fees" },
  { id: 30, field: "Borrower Email", previousValue: "rjames@email.com", newValue: "richardtjamerson@gmail.com", changedBy: "Richard Jamerson", position: "Borrower", timestamp: "03/04/2026 12:00 PM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 31, field: "Borrower Phone", previousValue: "(555) 000-0000", newValue: "(123) 456-7890", changedBy: "Richard Jamerson", position: "Borrower", timestamp: "03/04/2026 11:55 AM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 32, field: "Years Employed", previousValue: "2", newValue: "5", changedBy: "Richard Jamerson", position: "Borrower", timestamp: "03/03/2026 10:30 AM", section: "Borrower Information", navItem: "Borrower Information" },
  { id: 33, field: "Flood Certification Fee", previousValue: "—", newValue: "$15.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/03/2026 10:00 AM", section: "Fees", navItem: "Fees" },
  { id: 34, field: "Estimated Property Value", previousValue: "$200,000.00", newValue: "$250,000.00", changedBy: "Jane Doe", position: "Underwriter", timestamp: "03/02/2026 03:00 PM", section: "Collateral", navItem: "Collateral" },
  { id: 35, field: "Cash Reserves", previousValue: "$2,500,000.00", newValue: "$5,000,000.00", changedBy: "System", position: "System", timestamp: "03/02/2026 02:50 PM", section: "Decisioning", navItem: "Decisioning" },
  { id: 36, field: "Total Monthly Payment", previousValue: "$1,200.00", newValue: "$1,650.00", changedBy: "System", position: "System", timestamp: "03/01/2026 05:00 PM", section: "Loan Details", navItem: "Loan Details" },
  { id: 37, field: "P&I Payment", previousValue: "$800.00", newValue: "$1,000.00", changedBy: "System", position: "System", timestamp: "03/01/2026 04:58 PM", section: "Loan Details", navItem: "Loan Details" },
  { id: 38, field: "Financed Fees", previousValue: "$3,000.00", newValue: "$4,455.00", changedBy: "System", position: "System", timestamp: "03/01/2026 04:55 PM", section: "Loan Details", navItem: "Loan Details" },
  { id: 39, field: "Total Loan Amount", previousValue: "$128,000.00", newValue: "$150,455.00", changedBy: "System", position: "System", timestamp: "02/28/2026 06:00 PM", section: "Loan Details", navItem: "Loan Details" },
  { id: 40, field: "Loan Created", previousValue: "—", newValue: "Loan 123456789", changedBy: "John Smith", position: "Loan Officer", timestamp: "02/28/2026 09:00 AM", section: "Loan Details", navItem: "Loan Details" },
];

const ITEMS_PER_PAGE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

const COLUMNS = [
  { key: "field" as const, label: "Field", width: "16.3%" },
  { key: "previousValue" as const, label: "Previous value", width: "16.3%" },
  { key: "newValue" as const, label: "New value", width: "16.3%" },
  { key: "changedBy" as const, label: "Changed by", width: "13.4%" },
  { key: "position" as const, label: "Position", width: "10.9%" },
  { key: "timestamp" as const, label: "Timestamp", width: "12.7%" },
  { key: "linkToField" as const, label: "Link to field", width: "14.1%" },
];

function parseTimestamp(ts: string): number {
  const [datePart, timePart, ampm] = ts.split(" ");
  const [month, day, year] = datePart.split("/").map(Number);
  let [hours, minutes] = timePart.split(":").map(Number);
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

interface HistoryContentProps {
  onNavigateToField?: (navItem: string) => void;
}

export function HistoryContent({ onNavigateToField }: HistoryContentProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("20");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const filteredAndSortedData = useMemo(() => {
    let data = MOCK_CHANGE_LOG;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (entry) =>
          entry.field.toLowerCase().includes(q) ||
          entry.previousValue.toLowerCase().includes(q) ||
          entry.newValue.toLowerCase().includes(q) ||
          entry.changedBy.toLowerCase().includes(q) ||
          entry.position.toLowerCase().includes(q) ||
          entry.timestamp.toLowerCase().includes(q) ||
          entry.section.toLowerCase().includes(q)
      );
    }
    const sorted = [...data].sort((a, b) => {
      const diff = parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp);
      return sortDirection === "desc" ? -diff : diff;
    });
    return sorted;
  }, [searchQuery, sortDirection]);

  const perPage = parseInt(itemsPerPage, 10);
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / perPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredAndSortedData.slice(start, start + perPage);
  }, [filteredAndSortedData, safePage, perPage]);

  const handlePageChange = (delta: number) => {
    setCurrentPage((p) => Math.max(1, Math.min(totalPages, p + delta)));
  };

  const handleItemsPerPageChange = (val: string) => {
    setItemsPerPage(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const toggleSort = () => {
    setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    setCurrentPage(1);
  };

  const handleLinkClick = (entry: ChangeLogEntry) => {
    if (onNavigateToField) {
      onNavigateToField(entry.navItem);
    } else if (entry.navItem === "Decisioning") {
      setLocation("/loans/1/decisioning");
    } else {
      setLocation(`/loans/1/origination?section=${encodeURIComponent(entry.navItem)}`);
    }
  };

  const SortIcon = sortDirection === "desc" ? ChevronDown : ChevronUp;

  return (
    <div
      className="flex flex-col"
      style={{
        padding: "var(--roads-spacing-component-xl)",
      }}
      data-testid="history-content"
    >
      <div
        className="flex flex-col"
        style={{
          backgroundColor: "var(--roads-bg-primary)",
          border: "1px solid var(--roads-border-subtle)",
          borderRadius: "var(--roads-radius-xs)",
          overflow: "hidden",
        }}
        data-testid="change-log-table"
      >
        <div
          className="flex items-center justify-between flex-wrap"
          style={{
            padding: "24px",
            borderBottom: "1px solid var(--roads-border-subtle)",
            gap: "16px",
          }}
        >
          <h2
            className="headline-200"
            style={{ color: "var(--roads-text-primary)" }}
            data-testid="text-change-log-title"
          >
            Change Log
          </h2>
          <div
            className="flex items-center"
            style={{
              width: 240,
              backgroundColor: "var(--roads-bg-primary)",
              border: "1px solid var(--roads-border-dark)",
              borderRadius: "var(--roads-radius-2xs)",
              padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-m)",
              gap: "var(--roads-spacing-component-xs)",
            }}
          >
            <Search style={{ width: 16, height: 16, color: "var(--roads-icon-dark)", flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Type to filter results"
              className="body-100"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--roads-text-primary)",
                padding: 0,
                lineHeight: "20px",
              }}
              data-testid="input-search-change-log"
            />
          </div>
        </div>

        <div
          className="flex"
          style={{ backgroundColor: "var(--roads-bg-light)" }}
        >
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className="label-strong"
              style={{
                width: col.width,
                padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
                color: "var(--roads-text-primary)",
                lineHeight: "24px",
                whiteSpace: "nowrap",
                ...(col.key === "timestamp" ? {
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--roads-spacing-component-xs)",
                  userSelect: "none" as const,
                } : {}),
              }}
              onClick={col.key === "timestamp" ? toggleSort : undefined}
              data-testid={`th-${col.key}`}
            >
              {col.label}
              {col.key === "timestamp" && (
                <SortIcon style={{ width: 16, height: 16, color: "var(--roads-icon-dark)" }} />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {paginatedData.map((entry) => (
            <div
              key={entry.id}
              className="flex"
              style={{ borderTop: "1px solid var(--roads-border-subtle)" }}
              data-testid={`change-log-row-${entry.id}`}
            >
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className={col.key === "linkToField" ? undefined : "body-100"}
                  style={{
                    width: col.width,
                    padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
                    color: "var(--roads-text-primary)",
                    lineHeight: "24px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  data-testid={`td-${col.key}-${entry.id}`}
                >
                  {col.key === "linkToField" ? (
                    <button
                      onClick={() => handleLinkClick(entry)}
                      className="label-strong"
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "var(--roads-text-link)",
                      }}
                      data-testid={`link-to-field-${entry.id}`}
                    >
                      {entry.section}
                    </button>
                  ) : (
                    entry[col.key as keyof typeof entry]
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          className="flex items-center justify-between flex-wrap"
          style={{
            backgroundColor: "var(--roads-bg-light)",
            padding: "var(--roads-spacing-component-l)",
            borderTop: "1px solid var(--roads-border-subtle)",
            gap: "var(--roads-spacing-component-m)",
          }}
          data-testid="change-log-footer"
        >
          <div />
          <div
            className="flex items-center"
            style={{ gap: "var(--roads-spacing-layout-xs)" }}
          >
            <div
              className="flex items-center"
              style={{ gap: "var(--roads-spacing-component-xs)" }}
            >
              <span
                className="body-100"
                style={{ color: "var(--roads-text-primary)", lineHeight: "24px", whiteSpace: "nowrap" }}
              >
                Items per page:
              </span>
              <RoadsDropdown
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                options={ITEMS_PER_PAGE_OPTIONS}
                variant="inline"
                testId="select-items-per-page"
                openUpward
              />
            </div>

            <div
              className="flex items-center"
              style={{ gap: "var(--roads-spacing-layout-xs)" }}
            >
              <span
                className="body-100"
                style={{ color: "var(--roads-text-primary)", lineHeight: "24px", whiteSpace: "nowrap" }}
                data-testid="text-page-indicator"
              >
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(-1)}
                disabled={safePage <= 1}
                style={{
                  background: "none",
                  border: "none",
                  cursor: safePage <= 1 ? "default" : "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  opacity: safePage <= 1 ? 0.3 : 1,
                }}
                data-testid="button-prev-page"
              >
                <ChevronLeft style={{ width: 20, height: 20, color: "var(--roads-icon-dark)" }} />
              </button>
              <button
                onClick={() => handlePageChange(1)}
                disabled={safePage >= totalPages}
                style={{
                  background: "none",
                  border: "none",
                  cursor: safePage >= totalPages ? "default" : "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  opacity: safePage >= totalPages ? 0.3 : 1,
                }}
                data-testid="button-next-page"
              >
                <ChevronRight style={{ width: 20, height: 20, color: "var(--roads-icon-dark)" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
