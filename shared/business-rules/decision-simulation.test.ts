import { describe, expect, it } from "vitest";
import type { LoanApplication } from "../loan-application";
import { decisionMode, simulateLoanDecision } from "./decision-simulation";
import { sectionSchemas } from "../loan-contract";

const app = (mode: string) => ({ sections: { "decision-mode": mode } }) as LoanApplication;
describe("decision simulation", () => {
  it("preserves approval for existing loans", () => {
    expect(decisionMode(null)).toBe("force-approval");
    expect(simulateLoanDecision(null)).toBe("approved");
  });
  it("honors both forced outcomes", () => {
    expect(simulateLoanDecision(app("force-approval"))).toBe("approved");
    expect(simulateLoanDecision(app("force-denial"))).toBe("denied");
  });
  it("maps the retired EDE selection to forced approval without invalidating saved loans", () => {
    expect(decisionMode(app("real-ede"))).toBe("force-approval");
    expect(simulateLoanDecision(app("real-ede"))).toBe("approved");
    expect(sectionSchemas["decision-mode"].safeParse("real-ede").success).toBe(true);
  });
  it("validates persisted modes and outcomes", () => {
    expect(sectionSchemas["decision-mode"].safeParse("force-denial").success).toBe(true);
    expect(sectionSchemas["decision-mode"].safeParse("other").success).toBe(false);
    expect(sectionSchemas["decision-outcome"].safeParse("denied").success).toBe(true);
    expect(sectionSchemas["decision-outcome"].safeParse(null).success).toBe(true);
  });
});
