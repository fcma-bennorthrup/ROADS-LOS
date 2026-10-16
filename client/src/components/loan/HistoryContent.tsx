import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search } from "lucide-react";
import { RoadsDropdown } from "./RoadsDropdown";
import { CHANGE_LOG, COLUMNS, ITEMS_PER_PAGE_OPTIONS, type ChangeLogEntry } from "./history-data";
import { filterAndSortHistory } from "./history-transforms";

interface HistoryContentProps {
  loanId: string;
  onNavigateToField?: (navItem: string) => void;
}

export function HistoryContent({ loanId, onNavigateToField }: HistoryContentProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("20");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const filteredAndSortedData = useMemo(() => {
    return filterAndSortHistory(CHANGE_LOG, searchQuery, sortDirection);
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
      setLocation(`/loans/${loanId}/decisioning`);
    } else {
      setLocation(`/loans/${loanId}/origination?section=${encodeURIComponent(entry.navItem)}`);
    }
  };

  const SortIcon = sortDirection === "desc" ? ChevronDown : ChevronUp;

  return (
    <div
      className="flex flex-1 flex-col"
      style={{
        padding: "var(--roads-spacing-component-xl)",
      }}
      data-testid="history-content"
    >
      <div
        className="flex flex-1 flex-col"
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

        <div className="flex flex-1 flex-col">
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
