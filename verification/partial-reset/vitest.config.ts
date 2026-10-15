import { defineConfig, mergeConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";

export default mergeConfig(baseline, defineConfig({
  test: {
    include: [
      "verification/partial-reset/*.test.tsx",
      "verification/reset-consumption/*.test.tsx",
      "verification/closing-booking/*.test.tsx",
      "client/src/components/loan/__tests__/ChecklistPanel.test.tsx",
      "client/src/components/loan/__tests__/ClosingPackageProgress.test.tsx",
      "client/src/components/loan/__tests__/DocumentsContent.test.tsx",
      "client/src/components/loan/__tests__/ClosingDocumentsContent.test.tsx",
      "client/src/components/loan/__tests__/LoanActivityPanel.test.tsx",
      "client/src/components/loan/__tests__/CollateralContent.test.tsx",
      "client/src/components/loan/__tests__/ProductPricingContent.test.tsx",
      "client/src/components/loan/__tests__/DecisioningSummaryContent.test.tsx",
      "client/src/hooks/__tests__/use-closing-disclosure-delivery.test.tsx",
    ],
  },
}));
