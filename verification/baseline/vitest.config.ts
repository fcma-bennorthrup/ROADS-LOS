import { mergeConfig, defineConfig } from "vitest/config";
import original from "../../vitest.config";

export default mergeConfig(original, defineConfig({
  test: {
    setupFiles: ["./verification/baseline/setup.ts"],
    maxWorkers: 1,
    fileParallelism: false,
  },
}));
