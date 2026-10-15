// Executed only in the disposable accepted-dependency copy.
import { build } from "esbuild";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const sha = b => createHash("sha256").update(b).digest("hex");
const manifest = JSON.parse(await fs.readFile("../fonts/manifest.json", "utf8"));
for (const font of manifest.fonts) {
  if (sha(await fs.readFile("../fonts/" + font.file)) !== font.sha256) throw Error("Font drift");
}
const fontCss = await fs.readFile("../fonts/inline.css", "utf8");
if (sha(fontCss) !== manifest.inline_css_sha256) throw Error("Font CSS drift");
const js = await build({ entryPoints:["verification/tokens/browser-entry.tsx"],
  outdir:"unused",bundle:true,write:false,metafile:true,format:"iife",jsx:"automatic",
  define:{"process.env.NODE_ENV":'"production"'},
});
const script = js.outputFiles.find(f=>f.path.endsWith(".js")).text;
const inputs = {};
for (const name of Object.keys(js.metafile.inputs)) inputs[name] = sha(await fs.readFile(name));
await fs.writeFile("../browser-inputs.json", JSON.stringify(inputs,null,2)+"\n");
const componentCss = js.outputFiles.find(f=>f.path.endsWith(".css"))?.text || "";
let authored = await fs.readFile("client/src/index.css", "utf8");
authored = authored.replace("@import './styles/design-tokens.css';",
  await fs.readFile("client/src/styles/design-tokens.css", "utf8"));
// No fixture classes are injected into the production Tailwind scan.
const css = (await postcss([tailwind({config:"./tailwind.config.ts"}),autoprefixer()])
  .process(authored,{from:"client/src/index.css"})).css + "\n" + componentCss;
const guard = `
window.fixtureErrors=[];window.externalAttempts=[];
window.addEventListener('error',e=>window.fixtureErrors.push(e.message));
window.addEventListener('unhandledrejection',e=>window.fixtureErrors.push(String(e.reason)));
const deny=(name)=>{window.externalAttempts.push(name);throw Error("FIXTURE_EXTERNAL_BLOCKED:"+name)};
window.fetch=()=>deny("fetch");window.XMLHttpRequest=class{constructor(){deny("XHR")}};
window.WebSocket=class{constructor(){deny("WebSocket")}};window.open=()=>deny("window.open");
const NativeDate=Date;window.Date=class extends NativeDate{
  constructor(...args){super(...(args.length?args:["2026-10-14T16:00:00.000Z"]))}
  static now(){return 1791993600000}
};Math.random=()=>0.42;
`;
for (const font of ["loaded","blocked"])
  for (const version of ["baseline","candidate"]) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';img-src data:;connect-src 'none';font-src ${font==="loaded"?"data:":"'none'"}">
<style>${font==="loaded"?fontCss:""}\n${css}</style></head><body><div id="root"></div>
<script>${guard}${script.replaceAll("</script","<\\/script")}</script></body></html>`;
    await fs.writeFile(`../${version}-${font}.html`,html);
  }
await fs.writeFile("../browser-build.json",JSON.stringify({
  css_sha256:sha(css),js_sha256:sha(script),fonts_sha256:manifest.inline_css_sha256,
  font_resources:manifest.fonts.length,
  baseline_candidate_identical_inputs:true
},null,2)+"\n");
