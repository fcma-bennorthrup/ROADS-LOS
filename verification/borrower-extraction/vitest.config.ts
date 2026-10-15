import { defineConfig, mergeConfig } from "vitest/config";
import origination from "../origination/vitest.config";

export default mergeConfig(origination, defineConfig({
  test: {
    include: [
      "verification/borrower-extraction/*.test.tsx",
      "verification/origination/*.test.tsx",
      "client/src/components/loan/__tests__/CollateralContent.test.tsx",
      "client/src/components/loan/__tests__/ProductPricingContent.test.tsx",
    ],
  },
}));
