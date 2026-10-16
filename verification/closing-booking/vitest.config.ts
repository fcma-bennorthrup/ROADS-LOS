import { defineConfig, mergeConfig } from "vitest/config";
import shared from "../baseline/vitest.config";

export default mergeConfig(shared, defineConfig({
  test: { include: ["verification/closing-booking/*.test.tsx"] },
}));
