import { build } from "esbuild";
import fs from "node:fs/promises";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const stubs = {
  "wouter": `export const useParams=()=>({id:"2"}); export const useLocation=()=>["/loans/2/history",()=>{throw Error("Unexpected navigation")}];`,
  "@/contexts/checklist-context": `export const useChecklist=()=>({tasks:[]});`,
  "@/contexts/loan-activity-context": `export const useActivityPanel=()=>({
    activityPanelOpen:new URLSearchParams(location.search).get("mode")==="activity",
    activityItems:[],toggleActivityPanel:()=>{},closeActivityPanel:()=>{}});`,
  "@/components/GitHubSyncPanel": `export const GitHubSyncPanel=()=>null;`,
  "@/components/loan/ChecklistPanel": `export const ChecklistPanel=()=>null;`,
};
const js = await build({
  entryPoints: ["verification/history-loan-scope/capture-entry.tsx"],
  bundle: true, write: false, format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{
    name: "inert-boundaries",
    setup(api) {
      api.onResolve({ filter: /.*/ }, args => args.path in stubs
        ? { path: args.path, namespace: "fixture" } : undefined);
      api.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: stubs[args.path], loader: "js" }));
    },
  }],
});
let css = await fs.readFile("client/src/index.css", "utf8");
css = css.replace("@import './styles/design-tokens.css';", await fs.readFile("client/src/styles/design-tokens.css", "utf8"));
const result = await postcss([tailwind({ config: "./tailwind.config.ts" }), autoprefixer()]).process(css, { from: "client/src/index.css" });
// Reuse the unchanged History CDP capture runner and its expected output path.
await fs.writeFile("verification/history/capture.html", `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'">
<style>${result.css}</style></head><body><div id="root"></div>
<script>${js.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`);
