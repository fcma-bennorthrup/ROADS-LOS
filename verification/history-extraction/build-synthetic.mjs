// Extend the existing safe History capture builder only inside the disposable
// fixture. Production never gains a record-injection API.
import fs from "node:fs/promises";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["verification/history/fixtures.ts"], bundle: true,
  write: false, format: "esm", platform: "node",
});
const { records } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
let builder = await fs.readFile("verification/history-loan-scope/build-capture.mjs", "utf8");
const marker = "setup(api) {";
if (builder.split(marker).length !== 2) throw Error("Capture builder boundary changed");
builder = builder.replace(marker, `${marker}
      api.onLoad({ filter: /\\/(HistoryContent\\.tsx|history-data\\.ts)$/ }, async args => {
        const source = await fs.readFile(args.path, "utf8");
        return { contents: source.replace("const CHANGE_LOG: ChangeLogEntry[] = [];",
          ${JSON.stringify(`const CHANGE_LOG: ChangeLogEntry[] = ${JSON.stringify(records)};`)}), loader: "tsx" };
      });
`);
builder = builder.replace("verification/history-loan-scope/capture-entry.tsx",
  "verification/history-extraction/capture-entry.tsx");
await fs.writeFile("verification/history-extraction/disposable-builder.mjs", builder);
await import("./disposable-builder.mjs");
