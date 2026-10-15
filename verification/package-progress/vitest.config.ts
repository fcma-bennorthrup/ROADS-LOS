import { defineConfig, mergeConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";

export default mergeConfig(baseline, defineConfig({
  test: { include: [
    "verification/package-progress/*.test.tsx",
    "verification/partial-reset/reset.test.tsx",
    "verification/documents/route.test.tsx",
    "client/src/components/loan/__tests__/ClosingPackageProgress.test.tsx",
    "client/src/components/loan/__tests__/ClosingDocumentsContent.test.tsx",
    "client/src/components/loan/__tests__/DocumentsContent.test.tsx",
  ] },
}));
