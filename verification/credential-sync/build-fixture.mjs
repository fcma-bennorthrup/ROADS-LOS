import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import postcss from "postcss";
import tailwind from "tailwindcss";

// Run inside the disposable copy; all outputs stay there.
const out = path.resolve("fixture-output");
mkdirSync(out, { recursive: true });
const baseline = process.argv[2];
for (const variant of baseline ? ["candidate", "baseline"] : ["candidate"]) {
  await build({
    entryPoints: ["verification/credential-sync/fixture.tsx"],
    outfile: `${out}/${variant}.js`, bundle: true, platform: "browser",
    jsx: "automatic", alias: { "@": path.resolve("client/src") },
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: variant === "baseline" ? [{
      name: "original-dialog",
      setup(builder) {
        builder.onLoad({ filter: /\/ConflictResolutionDialog\.tsx$/ }, () => ({
          contents: readFileSync(baseline, "utf8"), loader: "tsx",
          resolveDir: path.resolve("client/src/components"),
        }));
      },
    }] : [],
  });
  writeFileSync(`${out}/${variant}.html`, `<!doctype html><html><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'">
    <link rel="stylesheet" href="fixture.css"><title>Isolated sync fixture</title></head>
    <body><div id="root"></div><script src="${variant}.js"></script></body></html>`);
}
const require = createRequire(import.meta.url);
const config = (await build({
  entryPoints: ["tailwind.config.ts"], bundle: true, platform: "node", format: "cjs",
  write: false, packages: "external",
})).outputFiles[0].text;
const mod = { exports: {} };
new Function("require", "module", "exports", config)(require, mod, mod.exports);
const css = readFileSync("client/src/index.css", "utf8").replace(
  "@import './styles/design-tokens.css';", readFileSync("client/src/styles/design-tokens.css", "utf8"),
);
// Freeze animations only in this disposable capture fixture, identically for
// baseline and candidate. Production CSS is never modified.
writeFileSync(`${out}/fixture.css`, (await postcss([tailwind(mod.exports.default)]).process(css, { from: undefined })).css
  + "\n*, *::before, *::after { animation: none !important; transition: none !important; }\n");
console.log(out);
