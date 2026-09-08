import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { useEffect } from "react";
import { LoanActivityPanel } from "../LoanActivityPanel";
import { LoanActivityProvider, useActivityPanel } from "@/contexts/loan-activity-context";

// Renders LoanActivityPanel in its open state.
// A tiny sibling component forces the panel open via the context on mount.
function OpenedPanel() {
  const { toggleActivityPanel } = useActivityPanel();
  useEffect(() => {
    toggleActivityPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <LoanActivityPanel />;
}

function renderPanel() {
  return render(
    <LoanActivityProvider>
      <OpenedPanel />
    </LoanActivityProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search filter
// ─────────────────────────────────────────────────────────────────────────────

describe("LoanActivityPanel – search filter", () => {
  it("renders all 7 items when search is empty", () => {
    renderPanel();
    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    expect(items.length).toBe(7);
  });

  it("narrows results by title (case-insensitive)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByTestId("input-activity-search"), "appraisal");

    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    expect(items.length).toBe(1);
    expect(within(items[0]).getByText("Appraisal Requested")).toBeInTheDocument();
  });

  it("narrows results by description (case-insensitive)", async () => {
    const user = userEvent.setup();
    renderPanel();

    // "loan estimate" appears only in the description of item 3
    await user.type(screen.getByTestId("input-activity-search"), "LOAN ESTIMATE");

    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    expect(items.length).toBe(1);
    expect(within(items[0]).getByText("Document Generated")).toBeInTheDocument();
  });

  it("matches partial strings and returns multiple results", async () => {
    const user = userEvent.setup();
    renderPanel();

    // "document" matches titles of "Document Generated" and "Document Received"
    await user.type(screen.getByTestId("input-activity-search"), "document");

    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    expect(items.length).toBe(2);
  });

  it("restores the full list when search input is cleared", async () => {
    const user = userEvent.setup();
    renderPanel();
    const input = screen.getByTestId("input-activity-search");

    await user.type(input, "appraisal");
    expect(within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/).length).toBe(1);

    await user.clear(input);
    expect(within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/).length).toBe(7);
  });

  it("shows 'No results found' empty state when nothing matches", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByTestId("input-activity-search"), "zzzzzz-nonexistent");

    expect(screen.getByTestId("activity-no-results")).toBeInTheDocument();
    expect(screen.getByText("No results found")).toBeInTheDocument();
    expect(within(screen.getByTestId("activity-list")).queryAllByTestId(/^activity-item-/).length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sort order
// ─────────────────────────────────────────────────────────────────────────────

describe("LoanActivityPanel – sort order", () => {
  it("defaults to newest-first order", () => {
    renderPanel();
    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);

    // Item 1 (July 9) is newest → first; Item 7 (July 2, 10:05) is oldest → last
    expect(items[0]).toHaveAttribute("data-testid", "activity-item-1");
    expect(items[items.length - 1]).toHaveAttribute("data-testid", "activity-item-7");
  });

  it("sorts oldest-first when 'Oldest' is selected", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.selectOptions(screen.getByTestId("select-sort"), "oldest");

    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    // Item 7 (July 2, 10:05) is oldest → first; Item 1 (July 9) is newest → last
    expect(items[0]).toHaveAttribute("data-testid", "activity-item-7");
    expect(items[items.length - 1]).toHaveAttribute("data-testid", "activity-item-1");
  });

  it("restores newest-first when toggled back to 'Newest'", async () => {
    const user = userEvent.setup();
    renderPanel();
    const select = screen.getByTestId("select-sort");

    await user.selectOptions(select, "oldest");
    await user.selectOptions(select, "newest");

    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    expect(items[0]).toHaveAttribute("data-testid", "activity-item-1");
    expect(items[items.length - 1]).toHaveAttribute("data-testid", "activity-item-7");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Search + sort combined
// ─────────────────────────────────────────────────────────────────────────────

describe("LoanActivityPanel – search and sort combined", () => {
  it("applies newest-first sort to the filtered result set", async () => {
    const user = userEvent.setup();
    renderPanel();

    // "richard jamerson" appears in descriptions of items 2, 5, and 6
    await user.type(screen.getByTestId("input-activity-search"), "richard jamerson");

    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    expect(items.length).toBe(3);

    // Newest first: item 2 (July 8) → item 5 (July 3) → item 6 (July 2)
    expect(items[0]).toHaveAttribute("data-testid", "activity-item-2");
    expect(items[1]).toHaveAttribute("data-testid", "activity-item-5");
    expect(items[2]).toHaveAttribute("data-testid", "activity-item-6");
  });

  it("applies oldest-first sort to the filtered result set", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByTestId("input-activity-search"), "richard jamerson");
    await user.selectOptions(screen.getByTestId("select-sort"), "oldest");

    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    expect(items.length).toBe(3);

    // Oldest first: item 6 (July 2) → item 5 (July 3) → item 2 (July 8)
    expect(items[0]).toHaveAttribute("data-testid", "activity-item-6");
    expect(items[1]).toHaveAttribute("data-testid", "activity-item-5");
    expect(items[2]).toHaveAttribute("data-testid", "activity-item-2");
  });

  it("shows empty state when search has no matches regardless of sort order", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByTestId("input-activity-search"), "zzzzzz");
    await user.selectOptions(screen.getByTestId("select-sort"), "oldest");

    expect(screen.getByTestId("activity-no-results")).toBeInTheDocument();
    expect(within(screen.getByTestId("activity-list")).queryAllByTestId(/^activity-item-/).length).toBe(0);
  });

  it("restores all items in the current sort order after clearing search", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Set sort to oldest first, then filter, then clear
    await user.selectOptions(screen.getByTestId("select-sort"), "oldest");
    const input = screen.getByTestId("input-activity-search");
    await user.type(input, "appraisal");
    expect(within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/).length).toBe(1);

    await user.clear(input);

    const items = within(screen.getByTestId("activity-list")).getAllByTestId(/^activity-item-/);
    expect(items.length).toBe(7);
    // Still oldest-first
    expect(items[0]).toHaveAttribute("data-testid", "activity-item-7");
    expect(items[items.length - 1]).toHaveAttribute("data-testid", "activity-item-1");
  });
});
