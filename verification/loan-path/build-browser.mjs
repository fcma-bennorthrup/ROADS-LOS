import { build } from "esbuild";
import fs from "node:fs/promises";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const js = await build({
  entryPoints: ["verification/loan-path/browser.tsx"], bundle: true, write: false,
  format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{
    name: "inert-admin",
    setup(api) {
      api.onResolve({ filter: /^@\/components\/GitHubSyncPanel$/ }, () => ({ path: "admin", namespace: "fixture" }));
      api.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const GitHubSyncPanel=()=>null;" }));
    },
  }],
});
let css = await fs.readFile("client/src/index.css", "utf8");
css = css.replace("@import './styles/design-tokens.css';", await fs.readFile("client/src/styles/design-tokens.css", "utf8"));
const result = await postcss([tailwind({ config: "./tailwind.config.ts" }), autoprefixer()]).process(css, { from: "client/src/index.css" });
const clock = `const RealDate=Date;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:["2026-10-14T16:00:00Z"]))}static now(){return 1791993600000}};`;
await fs.writeFile("verification/loan-path/browser.html", `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'">
<style>${result.css}</style></head><body><div id="root"></div>
<script>${clock}${js.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`);
