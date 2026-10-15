import { mergeConfig, defineConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";

export default mergeConfig(baseline, defineConfig({
  test: { include: [
    "verification/loan-query/*.test.tsx",
    "verification/origination/route.test.tsx",
    "verification/decisioning/route.test.tsx",
    "verification/closing-booking/route.test.tsx",
    "verification/documents/route.test.tsx",
    "verification/history/page.test.tsx",
    "verification/summary/query.test.tsx",
    "verification/coming-soon/page.test.tsx",
  ] },
}));
