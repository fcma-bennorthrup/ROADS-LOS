import { defineConfig, mergeConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";
export default mergeConfig(baseline, defineConfig({
  test: {
    include: [
      "verification/disclosure-coordination/*.test.tsx",
      "client/src/components/loan/__tests__/Closing*.test.tsx",
      "client/src/components/loan/__tests__/DocumentsContent.test.tsx",
      "client/src/components/loan/__tests__/ChecklistPanel.test.tsx",
      "client/src/hooks/__tests__/use-closing-disclosure-delivery.test.tsx",
      "client/src/lib/__tests__/closing-disclosure*.test.ts",
      "verification/partial-reset/*.test.tsx",
    ],
  },
}));
