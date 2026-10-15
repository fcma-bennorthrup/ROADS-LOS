import { createHash } from "node:crypto";
import { defineConfig, mergeConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";
import { records } from "./fixtures";

export default mergeConfig(baseline, defineConfig({
  plugins: [{
    name: "history-synthetic-seed-only",
    enforce: "pre",
    transform(source, id) {
      if (!id.endsWith("/client/src/components/loan/HistoryContent.tsx")) return;
      const expected = "f9108e55498ba754f15484530ce3709aa34f42ce6964e643314e2fe7cd8ea9f0";
      if (createHash("sha256").update(source).digest("hex") !== expected) {
        throw new Error("History source changed: review the fixture boundary before running");
      }
      const seed = /const MOCK_CHANGE_LOG: ChangeLogEntry\[\] = \[[\s\S]*?\n\];/g;
      if ([...source.matchAll(seed)].length !== 1) throw new Error("Ambiguous seed boundary");
      return {
        code: source.replace(seed, `const MOCK_CHANGE_LOG: ChangeLogEntry[] = ${JSON.stringify(records)};`),
        map: null,
      };
    },
  }],
  test: { include: ["verification/history/*.test.tsx"] },
}));
