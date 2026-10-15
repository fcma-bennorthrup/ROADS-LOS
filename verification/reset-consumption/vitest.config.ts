import { defineConfig, mergeConfig } from "vitest/config";
import origination from "../origination/vitest.config";

export default mergeConfig(origination, defineConfig({
  test: {
    include: ["verification/reset-consumption/*.test.tsx"],
    // These four historical-defect assertions still run against the baseline.
    // Their approved replacement journeys are in reset.test.tsx.
    testNamePattern: /^(?!.*(?:historical reset replay|replays after a newer save))/,
  },
}));
