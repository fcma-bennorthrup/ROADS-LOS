import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  outputDir: "../../generated-artifacts/pipeline-layout",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4175",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        || (existsSync("/repl/tools/bin/chromium") ? "/repl/tools/bin/chromium" : undefined),
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --config verification/pipeline-layout/vite.config.ts",
    cwd: "../..",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
  },
});
