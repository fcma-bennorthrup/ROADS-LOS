import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HistoryContent } from "@/components/loan/HistoryContent";
// Test-only module variant: production has no records or data injection API.
// @ts-expect-error Vite's test-only query loader supplies this module.
import { HistoryContent as SyntheticHistory } from "@/components/loan/HistoryContent.tsx?synthetic";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("wouter", () => ({ useLocation: () => ["/loans/2/history", navigate] }));
afterEach(() => { cleanup(); navigate.mockClear(); vi.useRealTimers(); });

it.each(["1", "2"])("shows no invented history for loan %s, including after search and sort", loanId => {
  render(<HistoryContent loanId={loanId} />);
  expect(screen.queryAllByTestId(/^change-log-row-/)).toHaveLength(0);
  expect(screen.getByTestId("text-page-indicator")).toHaveTextContent("Page 1 of 1");
  expect(screen.getByTestId("button-prev-page")).toBeDisabled();
  expect(screen.getByTestId("button-next-page")).toBeDisabled();
  expect(screen.getByTestId("history-content")).toHaveClass("flex-1");
  expect(screen.getByTestId("change-log-table")).toHaveClass("flex-1");
  fireEvent.change(screen.getByTestId("input-search-change-log"), { target: { value: "loan" } });
  fireEvent.click(screen.getByTestId("th-timestamp"));
  expect(screen.queryAllByTestId(/^change-log-row-/)).toHaveLength(0);
  expect(screen.getByTestId("text-page-indicator")).toHaveTextContent("Page 1 of 1");
  expect(navigate).not.toHaveBeenCalled();
});

const sections = ["Borrower Information", "Loan Details", "Collateral", "Product & Pricing", "Fees", "Decisioning"];
it.each(["1", "2"])("uses exact section URLs for loan %s", loanId => {
  render(<SyntheticHistory loanId={loanId} />);
  for (const section of sections) {
    fireEvent.click(screen.getAllByRole("button", { name: section, exact: true })[0]);
    expect(navigate).toHaveBeenLastCalledWith(section === "Decisioning"
      ? `/loans/${loanId}/decisioning`
      : `/loans/${loanId}/origination?section=${encodeURIComponent(section)}`);
  }
  expect(navigate).toHaveBeenCalledTimes(6);
});

it("honors callback precedence exactly once for all sections, without fallback", () => {
  const callback = vi.fn();
  render(<SyntheticHistory loanId="2" onNavigateToField={callback} />);
  for (const section of sections) {
    callback.mockClear();
    fireEvent.click(screen.getAllByRole("button", { name: section, exact: true })[0]);
    expect(callback).toHaveBeenCalledExactlyOnceWith(section);
  }
  expect(navigate).not.toHaveBeenCalled();
});

it("uses the new loan ID after a prop update, and resets controls after remount", () => {
  const view = render(<SyntheticHistory loanId="1" />);
  view.rerender(<SyntheticHistory loanId="2" />);
  fireEvent.click(screen.getAllByRole("button", { name: "Fees", exact: true })[0]);
  expect(navigate).toHaveBeenCalledExactlyOnceWith("/loans/2/origination?section=Fees");
  fireEvent.change(screen.getByTestId("input-search-change-log"), { target: { value: "Fees" } });
  view.unmount();
  render(<HistoryContent loanId="2" />);
  expect(screen.getByTestId("input-search-change-log")).toHaveValue("");
  expect(screen.getByTestId("text-page-indicator")).toHaveTextContent("Page 1 of 1");
});
