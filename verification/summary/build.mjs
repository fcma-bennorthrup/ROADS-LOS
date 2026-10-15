import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

// Run only within the preservation-checked disposable copy.
if (!process.cwd().startsWith("/tmp/validation-baseline-")) throw Error("Disposable copy required");
const out = path.resolve("summary-browser");
await mkdir(out, { recursive: true });
await build({
  entryPoints: ["verification/summary/browser.tsx"], outfile: `${out}/fixture.js`,
  bundle: true, platform: "browser", format: "iife", jsx: "automatic",
  alias: { "@": path.resolve("client/src"), "@shared": path.resolve("shared") },
  define: { "process.env.NODE_ENV": '"development"' },
});
execFileSync("node", ["node_modules/tailwindcss/lib/cli.js", "-i", "client/src/index.css",
  "-o", `${out}/fixture.css`, "--config", "tailwind.config.ts"], { stdio: "inherit" });
await writeFile(`${out}/index.html`, `<!doctype html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>Isolated synthetic Summary verification</title><link rel="stylesheet" href="/fixture.css">
</head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`);
console.log("Built isolated browser fixture:", out);
