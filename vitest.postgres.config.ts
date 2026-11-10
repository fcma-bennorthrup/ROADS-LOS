import { defineConfig } from "vitest/config";

// Explicit opt-in: unlike the browser/unit suite, this requires PostgreSQL.
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/__tests__/*.postgres.integration.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
  },
});
