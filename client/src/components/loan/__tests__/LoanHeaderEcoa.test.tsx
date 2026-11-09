import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoanHeader } from "../LoanHeader";
import { ChecklistProvider } from "@/contexts/checklist-context";
import { LoanActivityProvider } from "@/contexts/loan-activity-context";
import { evaluateLoanRules } from "@shared/business-rules";
import type { LoanApplication } from "@shared/loan-application";

const state = vi.hoisted(() => ({ document: null as LoanApplication | null }));
vi.mock("@/contexts/loan-application-context", () => ({ useApplicationStatus: () => state }));
vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));

describe("ECOA header chip", () => {
  it("appears on import and hides only after decision, generation and delivery", () => {
    const app = { loan: { id: "header-test" }, borrowers: [], sections: {},
      generation: 1, revision: 0, mode: "empty" } as unknown as LoanApplication;
    state.document = app;
    const header = () => <LoanActivityProvider><ChecklistProvider><LoanHeader /></ChecklistProvider></LoanActivityProvider>;
    app.businessRules = evaluateLoanRules(app);
    const view = render(header());
    expect(screen.queryByTestId("chip-ecoa-days")).toBeNull();
    app.mode = "blend";
    app.businessRules = evaluateLoanRules(app);
    view.rerender(header());
    expect(screen.getByTestId("chip-ecoa-days")).toHaveTextContent("30 ECOA days remaining");
    for (const actions of [
      ["complete", "not-started", "not-started"],
      ["complete", "complete", "not-started"],
      ["complete", "complete", "complete"],
    ]) {
      app.sections["storage:loan-checklist-statuses:header-test"] = JSON.stringify({
        "Loan Decision": [actions[0]], "Decision Letter": actions.slice(1),
      });
      app.businessRules = evaluateLoanRules(app);
      view.rerender(header());
      expect(Boolean(screen.queryByTestId("chip-ecoa-days"))).toBe(actions[2] !== "complete");
    }
  });
});
