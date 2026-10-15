import { defineConfig, mergeConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";

export default mergeConfig(baseline, defineConfig({
  test: {
    include: [
      "verification/loan-path/*.test.tsx",
      "verification/reset-consumption/reset.test.tsx",
      "client/src/components/loan/__tests__/ChecklistPanel.test.tsx",
      "client/src/components/loan/__tests__/LoanActivityPanel.test.tsx",
      "client/src/components/loan/__tests__/CollateralContent.test.tsx",
    ],
  },
}));
