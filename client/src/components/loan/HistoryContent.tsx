import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { RoadsDropdown } from "./RoadsDropdown";

interface ChangeLogEntry {
  id: number;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  date: string;
  section: string;
  changeType: string;
}

const MOCK_CHANGE_LOG: ChangeLogEntry[] = [
  { id: 1, field: "Primary Borrower Name", oldValue: "Richard James", newValue: "Richard Jamerson", changedBy: "John Smith", date: "03/15/2026", section: "Borrower Information", changeType: "Edit" },
  { id: 2, field: "Pricing Tier", oldValue: "Standard", newValue: "Premium", changedBy: "Jane Doe", date: "03/14/2026", section: "Product & Pricing", changeType: "Edit" },
  { id: 3, field: "Loan Amount", oldValue: "$125,000.00", newValue: "$150,000.00", changedBy: "John Smith", date: "03/14/2026", section: "Loan Details", changeType: "Edit" },
  { id: 4, field: "Interest Rate", oldValue: "6.500%", newValue: "7.255%", changedBy: "System", date: "03/13/2026", section: "Product & Pricing", changeType: "Recalculation" },
  { id: 5, field: "Appraisal Fee", oldValue: "—", newValue: "$450.00", changedBy: "Jane Doe", date: "03/13/2026", section: "Fees", changeType: "Add" },
  { id: 6, field: "Credit Report Fee", oldValue: "—", newValue: "$35.00", changedBy: "Jane Doe", date: "03/13/2026", section: "Fees", changeType: "Add" },
  { id: 7, field: "Collateral Address", oldValue: "123 Main St", newValue: "456 Oak Ave", changedBy: "John Smith", date: "03/12/2026", section: "Collateral", changeType: "Edit" },
  { id: 8, field: "Employer Name", oldValue: "Acme Corp", newValue: "Acme Industries", changedBy: "Richard Jamerson", date: "03/12/2026", section: "Borrower Information", changeType: "Edit" },
  { id: 9, field: "Monthly Income", oldValue: "$4,500.00", newValue: "$5,200.00", changedBy: "Richard Jamerson", date: "03/12/2026", section: "Borrower Information", changeType: "Edit" },
  { id: 10, field: "Loan Type", oldValue: "Conventional", newValue: "Construction", changedBy: "John Smith", date: "03/11/2026", section: "Loan Details", changeType: "Edit" },
  { id: 11, field: "Application Type", oldValue: "Individual", newValue: "Joint Credit Application", changedBy: "John Smith", date: "03/11/2026", section: "Loan Details", changeType: "Edit" },
  { id: 12, field: "Co-Borrower", oldValue: "—", newValue: "Jamelle Jamerson", changedBy: "John Smith", date: "03/11/2026", section: "Borrower Information", changeType: "Add" },
  { id: 13, field: "Property Type", oldValue: "Condo", newValue: "Single Family", changedBy: "Jane Doe", date: "03/10/2026", section: "Collateral", changeType: "Edit" },
  { id: 14, field: "Flood Insurance", oldValue: "Not Required", newValue: "Required", changedBy: "System", date: "03/10/2026", section: "Collateral", changeType: "Recalculation" },
  { id: 15, field: "Title Insurance Fee", oldValue: "—", newValue: "$1,200.00", changedBy: "Jane Doe", date: "03/10/2026", section: "Fees", changeType: "Add" },
  { id: 16, field: "Origination Fee", oldValue: "$1,000.00", newValue: "$1,500.00", changedBy: "Jane Doe", date: "03/09/2026", section: "Fees", changeType: "Edit" },
  { id: 17, field: "DTI Ratio", oldValue: "28.00%", newValue: "17.00%", changedBy: "System", date: "03/09/2026", section: "Decisioning", changeType: "Recalculation" },
  { id: 18, field: "LTV Ratio", oldValue: "85.00%", newValue: "80.00%", changedBy: "System", date: "03/09/2026", section: "Decisioning", changeType: "Recalculation" },
  { id: 19, field: "Credit Score", oldValue: "720", newValue: "756", changedBy: "System", date: "03/08/2026", section: "Decisioning", changeType: "Recalculation" },
  { id: 20, field: "Checking Account Balance", oldValue: "$10,000.00", newValue: "$25,000.00", changedBy: "Richard Jamerson", date: "03/08/2026", section: "Borrower Information", changeType: "Edit" },
  { id: 21, field: "Savings Account Balance", oldValue: "$5,000.00", newValue: "$15,000.00", changedBy: "Richard Jamerson", date: "03/08/2026", section: "Borrower Information", changeType: "Edit" },
  { id: 22, field: "Product", oldValue: "4374 - 30 year fixed", newValue: "4370 - 10 year fixed", changedBy: "John Smith", date: "03/07/2026", section: "Product & Pricing", changeType: "Edit" },
  { id: 23, field: "Term (Months)", oldValue: "360", newValue: "120", changedBy: "John Smith", date: "03/07/2026", section: "Product & Pricing", changeType: "Edit" },
  { id: 24, field: "Base Rate", oldValue: "6.750%", newValue: "6.125%", changedBy: "System", date: "03/07/2026", section: "Product & Pricing", changeType: "Recalculation" },
  { id: 25, field: "Recording Fee", oldValue: "—", newValue: "$125.00", changedBy: "Jane Doe", date: "03/06/2026", section: "Fees", changeType: "Add" },
  { id: 26, field: "Tax Service Fee", oldValue: "—", newValue: "$75.00", changedBy: "Jane Doe", date: "03/06/2026", section: "Fees", changeType: "Add" },
  { id: 27, field: "Stage", oldValue: "Application", newValue: "Loan Setup", changedBy: "John Smith", date: "03/05/2026", section: "Loan Details", changeType: "Edit" },
  { id: 28, field: "Underwriting Fee", oldValue: "—", newValue: "$500.00", changedBy: "Jane Doe", date: "03/05/2026", section: "Fees", changeType: "Add" },
  { id: 29, field: "Processing Fee", oldValue: "—", newValue: "$350.00", changedBy: "Jane Doe", date: "03/05/2026", section: "Fees", changeType: "Add" },
  { id: 30, field: "Borrower Email", oldValue: "rjames@email.com", newValue: "richardtjamerson@gmail.com", changedBy: "Richard Jamerson", date: "03/04/2026", section: "Borrower Information", changeType: "Edit" },
  { id: 31, field: "Borrower Phone", oldValue: "(555) 000-0000", newValue: "(123) 456-7890", changedBy: "Richard Jamerson", date: "03/04/2026", section: "Borrower Information", changeType: "Edit" },
  { id: 32, field: "Years Employed", oldValue: "2", newValue: "5", changedBy: "Richard Jamerson", date: "03/03/2026", section: "Borrower Information", changeType: "Edit" },
  { id: 33, field: "Flood Certification Fee", oldValue: "—", newValue: "$15.00", changedBy: "Jane Doe", date: "03/03/2026", section: "Fees", changeType: "Add" },
  { id: 34, field: "Estimated Property Value", oldValue: "$200,000.00", newValue: "$250,000.00", changedBy: "Jane Doe", date: "03/02/2026", section: "Collateral", changeType: "Edit" },
  { id: 35, field: "Cash Reserves", oldValue: "$2,500,000.00", newValue: "$5,000,000.00", changedBy: "System", date: "03/02/2026", section: "Decisioning", changeType: "Recalculation" },
  { id: 36, field: "Total Monthly Payment", oldValue: "$1,200.00", newValue: "$1,650.00", changedBy: "System", date: "03/01/2026", section: "Loan Details", changeType: "Recalculation" },
  { id: 37, field: "P&I Payment", oldValue: "$800.00", newValue: "$1,000.00", changedBy: "System", date: "03/01/2026", section: "Loan Details", changeType: "Recalculation" },
  { id: 38, field: "Financed Fees", oldValue: "$3,000.00", newValue: "$4,455.00", changedBy: "System", date: "03/01/2026", section: "Loan Details", changeType: "Recalculation" },
  { id: 39, field: "Total Loan Amount", oldValue: "$128,000.00", newValue: "$150,455.00", changedBy: "System", date: "02/28/2026", section: "Loan Details", changeType: "Recalculation" },
  { id: 40, field: "Loan Created", oldValue: "—", newValue: "Loan 123456789", changedBy: "John Smith", date: "02/28/2026", section: "Loan Details", changeType: "Add" },
];

const ITEMS_PER_PAGE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

const COLUMNS = [
  { key: "field" as const, label: "Field", flex: 1.2 },
  { key: "oldValue" as const, label: "Old Value", flex: 1.2 },
  { key: "newValue" as const, label: "New Value", flex: 1.2 },
  { key: "changedBy" as const, label: "Changed By", flex: 1 },
  { key: "date" as const, label: "Date", flex: 0.8 },
  { key: "section" as const, label: "Section", flex: 1 },
  { key: "changeType" as const, label: "Change Type", flex: 0.8 },
];

export function HistoryContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("20");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_CHANGE_LOG;
    const q = searchQuery.toLowerCase();
    return MOCK_CHANGE_LOG.filter(
      (entry) =>
        entry.field.toLowerCase().includes(q) ||
        entry.oldValue.toLowerCase().includes(q) ||
        entry.newValue.toLowerCase().includes(q) ||
        entry.changedBy.toLowerCase().includes(q) ||
        entry.date.toLowerCase().includes(q) ||
        entry.section.toLowerCase().includes(q) ||
        entry.changeType.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const perPage = parseInt(itemsPerPage, 10);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredData.slice(start, start + perPage);
  }, [filteredData, safePage, perPage]);

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

  return (
    <div
      className="flex flex-col"
      style={{
        padding: "var(--roads-spacing-component-xl)",
        flex: 1,
        minHeight: 0,
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
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
        data-testid="change-log-table"
      >
        <div
          className="flex items-center justify-between flex-wrap"
          style={{
            padding: "var(--roads-spacing-layout-xs)",
            borderBottom: "1px solid var(--roads-border-subtle)",
            gap: "var(--roads-spacing-component-m)",
          }}
        >
          <h2
            className="headline-300"
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
                flex: col.flex,
                padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
                color: "var(--roads-text-primary)",
                lineHeight: "24px",
                whiteSpace: "nowrap",
              }}
              data-testid={`th-${col.key}`}
            >
              {col.label}
            </div>
          ))}
        </div>

        <div className="flex flex-col" style={{ flex: 1, overflowY: "auto" }}>
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
                  className="body-100"
                  style={{
                    flex: col.flex,
                    padding: "var(--roads-spacing-component-xs) var(--roads-spacing-component-l)",
                    color: "var(--roads-text-primary)",
                    lineHeight: "24px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  data-testid={`td-${col.key}-${entry.id}`}
                >
                  {entry[col.key]}
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
            marginTop: "auto",
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
