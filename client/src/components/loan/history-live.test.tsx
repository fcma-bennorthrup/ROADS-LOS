import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HistoryContent } from "./HistoryContent";
import { applicationStore } from "@/lib/loan-application-store";
import { changesForSave } from "@shared/loan-history";
import type { LoanApplication } from "@shared/loan-application";

describe("loan-scoped History", () => {
  it("renders persisted changes, filters them, and never shows another loan's log", () => {
    const doc = { loan: { id: "history-test" }, borrowers: [], sections: {},
      mode: "empty", generation: 1, revision: 2,
      changeLog: changesForSave("borrower-primary", { firstName: "Alex" }, { firstName: "Sam" }, 2),
    } as unknown as LoanApplication;
    applicationStore.install(doc);
    const view = render(<HistoryContent loanId="history-test" />);
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Sam")).toBeTruthy();
    fireEvent.change(screen.getByTestId("input-search-change-log"), { target: { value: "no match" } });
    expect(screen.queryByText("Sam")).toBeNull();
    view.rerender(<HistoryContent loanId="another-loan" />);
    fireEvent.change(screen.getByTestId("input-search-change-log"), { target: { value: "" } });
    expect(screen.queryByText("Sam")).toBeNull();
    cleanup();
  });
});
