import { mergeConfig, defineConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";

export default mergeConfig(baseline, defineConfig({
  test: { include: ["verification/providers/*.test.tsx"] },
}));
