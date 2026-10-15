// Run inside the disposable copy with its accepted esbuild/PostCSS dependencies.
import { build } from "esbuild";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const fixtureBundle = await build({
  entryPoints: ["verification/history/fixtures.ts"], bundle: true, write: false,
  platform: "node", format: "esm",
});
const { records } = await import(`data:text/javascript;base64,${Buffer.from(fixtureBundle.outputFiles[0].text).toString("base64")}`);
const stubs = {
  "wouter": `export const useParams=()=>({id:"synthetic-B"}); export const useLocation=()=>["/loans/synthetic-B/history",()=>{throw Error("navigation outside capture scope")}];`,
  "@/contexts/checklist-context": `export const useChecklist=()=>({tasks:[]});`,
  "@/contexts/loan-activity-context": `export const useActivityPanel=()=>({
    activityPanelOpen:new URLSearchParams(location.search).get("mode")==="activity",
    activityItems:[{id:"fixture",title:"Synthetic activity only",description:"Not a Change Log entry",
      timestamp:"October 14, 2026 4:00pm",date:new Date("2026-10-14T16:00:00Z")}],
    toggleActivityPanel:()=>{},closeActivityPanel:()=>{}
  });`,
  "@/components/GitHubSyncPanel": `export const GitHubSyncPanel=()=>null;`,
  "@/components/loan/ChecklistPanel": `export const ChecklistPanel=()=>null;`,
};
const js = await build({
  entryPoints: ["verification/history/capture-entry.tsx"], bundle: true, write: false,
  format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{
    name: "inert-capture-boundaries",
    setup(api) {
      api.onResolve({ filter: /.*/ }, args => args.path in stubs
        ? { path: args.path, namespace: "fixture" } : undefined);
      api.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: stubs[args.path], loader: "js" }));
      api.onLoad({ filter: /\/HistoryContent\.tsx$/ }, async args => {
        const source = await fs.readFile(args.path, "utf8");
        if (createHash("sha256").update(source).digest("hex") !== "f9108e55498ba754f15484530ce3709aa34f42ce6964e643314e2fe7cd8ea9f0") {
          throw Error("History source drift");
        }
        return { contents: source.replace(/const MOCK_CHANGE_LOG: ChangeLogEntry\[\] = \[[\s\S]*?\n\];/,
          `const MOCK_CHANGE_LOG: ChangeLogEntry[] = ${JSON.stringify(records)};`), loader: "tsx" };
      });
    },
  }],
});
let css = await fs.readFile("client/src/index.css", "utf8");
css = css.replace("@import './styles/design-tokens.css';", await fs.readFile("client/src/styles/design-tokens.css", "utf8"));
const result = await postcss([tailwind({ config: "./tailwind.config.ts" }), autoprefixer()]).process(css, { from: "client/src/index.css" });
const clock = `const RealDate=Date;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:["2026-10-14T16:00:00Z"]))}static now(){return 1791993600000}};`;
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'">
<style>${result.css}</style></head><body><div id="root"></div><script>${clock}${js.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`;
await fs.writeFile("verification/history/capture.html", html);
