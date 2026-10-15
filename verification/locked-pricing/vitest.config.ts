import { defineConfig, mergeConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";
export default mergeConfig(baseline, defineConfig({
  test: {
    include: [
      "verification/locked-pricing/*.test.tsx",
      "verification/date-cancellation/*.test.tsx",
      "verification/reset-consumption/*.test.tsx",
      "verification/partial-reset/*.test.tsx",
      "verification/documents/*.test.tsx",
      "client/src/components/loan/__tests__/ProductPricingContent.test.tsx",
    ],
  },
}));
