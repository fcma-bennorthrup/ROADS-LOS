import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubSyncPanel } from "./GitHubSyncPanel";

vi.mock("@/components/LoanDemoControls", () => ({
  LoanDemoControls: () => <div data-testid="loan-demo-controls">Loan demo controls</div>,
}));
afterEach(cleanup);

describe("Prototype Admin Controls", () => {
  it("shows only the empty shell on the pipeline without requiring sync providers", () => {
    const close = vi.fn();
    render(<GitHubSyncPanel open onOpenChange={close} loanActive={false} />);
    expect(screen.getByTestId("admin-controls-shell")).toBeInTheDocument();
    expect(screen.queryByTestId("loan-demo-controls")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText(/GitHub|database|conflict|push|pull/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-close-sync-panel"));
    expect(close).toHaveBeenCalledWith(false);
  });

  it("shows demo controls directly inside a loan", () => {
    render(<GitHubSyncPanel open onOpenChange={vi.fn()} loanActive />);
    expect(screen.getByTestId("loan-demo-controls")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-controls-shell")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText(/GitHub|database|conflict|push|pull/i)).not.toBeInTheDocument();
  });
});
