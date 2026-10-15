import fs from "node:fs";
import { defineConfig, mergeConfig } from "vitest/config";
import baseline from "../baseline/vitest.config";
import { records } from "../history/fixtures";

export default mergeConfig(baseline, defineConfig({
  plugins: [{
    name: "history-navigation-synthetic-records",
    enforce: "pre",
    load(id) {
      if (!id.endsWith("HistoryContent.tsx?synthetic") && !id.endsWith("history-data.ts?synthetic")) return;
      const source = fs.readFileSync(id.split("?")[0], "utf8");
      if (id.endsWith("HistoryContent.tsx?synthetic")) {
        return source.replace('from "./history-data"', 'from "./history-data.ts?synthetic"');
      }
      const boundary = "const CHANGE_LOG: ChangeLogEntry[] = [];";
      if (source.split(boundary).length !== 2) throw Error("History fixture boundary changed");
      return source.replace(boundary, `const CHANGE_LOG: ChangeLogEntry[] = ${JSON.stringify(records)};`);
    },
  }],
  test: { include: ["verification/history-loan-scope/*.test.tsx"] },
}));
