import { defineConfig, mergeConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";

export default mergeConfig(baseline, defineConfig({
  test: {
    include: [
      "verification/origination/*.test.tsx",
      "client/src/components/loan/__tests__/CollateralContent.test.tsx",
      "client/src/components/loan/__tests__/ProductPricingContent.test.tsx",
    ],
  },
}));
