import { useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import { useActivityPanel } from "@/contexts/loan-activity-context";

export function LoanActivityPanel() {
  const { activityPanelOpen, activityItems, closeActivityPanel } = useActivityPanel();
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState("");

  if (!activityPanelOpen) return null;

  const query = search.trim().toLowerCase();
  const filteredItems = query
    ? activityItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      )
    : activityItems;

  const sortedItems =
    sort === "newest"
      ? [...filteredItems].sort((a, b) => b.date.getTime() - a.date.getTime())
      : [...filteredItems].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: 280,
        flexShrink: 0,
        borderLeft: "1px solid var(--roads-border-subtle)",
        backgroundColor: "var(--roads-bg-primary)",
      }}
      data-testid="loan-activity-panel"
    >
      {/* Header */}
      <div
        className="flex flex-col"
        style={{
          padding: "var(--roads-spacing-component-l)",
          gap: "var(--roads-spacing-component-m)",
          borderBottom: "1px solid var(--roads-border-subtle)",
          flexShrink: 0,
        }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h2 className="headline-200" style={{ color: "var(--roads-text-primary)" }}>
            Loan Activity
          </h2>
          <div className="flex items-center" style={{ gap: "var(--roads-spacing-component-xs)" }}>
            {/* Sort dropdown */}
            <div className="relative flex items-center">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                className="body-200-strong"
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  backgroundColor: "var(--roads-bg-primary)",
                  border: "1px solid var(--roads-border-dark)",
                  borderRadius: "var(--roads-radius-round)",
                  padding:
                    "var(--roads-spacing-component-3xs) var(--roads-spacing-component-xl) var(--roads-spacing-component-3xs) var(--roads-spacing-component-xs)",
                  color: "var(--roads-text-primary)",
                  cursor: "pointer",
                  outline: "none",
                  fontSize: "inherit",
                  fontFamily: "inherit",
                  fontWeight: "inherit",
                  lineHeight: "inherit",
                }}
                data-testid="select-sort"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
              <ChevronDown
                style={{
                  position: "absolute",
                  right: "var(--roads-spacing-component-2xs)",
                  width: 14,
                  height: 14,
                  color: "var(--roads-icon-dark)",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Close button */}
            <button
              onClick={closeActivityPanel}
              aria-label="Close activity panel"
              style={{
                color: "var(--roads-icon-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--roads-spacing-component-2xs)",
              }}
              data-testid="button-close-activity-panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center"
          style={{
            border: "1px solid var(--roads-border-subtle)",
            borderRadius: "var(--roads-radius-2xs)",
            padding:
              "var(--roads-spacing-component-xs) var(--roads-spacing-component-m)",
            gap: "var(--roads-spacing-component-xs)",
            backgroundColor: "var(--roads-bg-primary)",
          }}
        >
          <Search
            style={{ width: 16, height: 16, color: "var(--roads-icon-subtle)", flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="Search"
            className="body-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--roads-text-primary)",
              fontFamily: "inherit",
              fontSize: "inherit",
              fontWeight: "inherit",
              lineHeight: "inherit",
            }}
            data-testid="input-activity-search"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              style={{
                color: "var(--roads-icon-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                padding: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              data-testid="button-clear-search"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      </div>

      {/* Activity list */}
      <div
        className="flex flex-col overflow-y-auto flex-1"
        style={{ padding: "var(--roads-spacing-component-m)" }}
        data-testid="activity-list"
      >
        {sortedItems.length === 0 && (
          <div
            className="flex flex-col items-center justify-center flex-1"
            style={{ padding: "var(--roads-spacing-component-xl)", textAlign: "center" }}
            data-testid="activity-no-results"
          >
            <span className="body-200" style={{ color: "var(--roads-text-secondary)" }}>
              No results found
            </span>
          </div>
        )}
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className="flex"
            style={{ gap: "var(--roads-spacing-component-m)", paddingBottom: "var(--roads-spacing-component-l)" }}
            data-testid={`activity-item-${item.id}`}
          >
            {/* Blue bullet */}
            <div style={{ paddingTop: 6, flexShrink: 0 }}>
              <span
                style={{
                  display: "block",
                  width: 8,
                  height: 8,
                  borderRadius: "var(--roads-radius-round)",
                  backgroundColor: "var(--roads-bg-information, var(--roads-text-information))",
                }}
              />
            </div>

            {/* Content */}
            <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-3xs)", minWidth: 0 }}>
              <span className="body-200-strong" style={{ color: "var(--roads-text-primary)" }}>
                {item.title}
              </span>
              <span className="body-200" style={{ color: "var(--roads-text-primary)" }}>
                {item.description}
              </span>
              <span className="caption-100" style={{ color: "var(--roads-text-secondary)" }}>
                {item.timestamp}
              </span>
              {item.link && (
                <button
                  className="caption-100-strong"
                  onClick={() => {}}
                  style={{
                    color: "var(--roads-text-link)",
                    textAlign: "left",
                    padding: 0,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  data-testid={`link-${item.link.label.toLowerCase().replace(/\s+/g, "-")}-${item.id}`}
                >
                  {item.link.label}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
