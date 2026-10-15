import { build } from "esbuild";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const filename = "client/src/components/ConflictResolutionDialog.tsx";
const candidate = await fs.readFile(filename, "utf8");
const inside = `  const diffRows = useMemo(() => {
    const localLines = (localContent || "").split("\\n");
    const remoteLines = (remoteContent || "").split("\\n");
    const maxLines = Math.max(localLines.length, remoteLines.length);
`;
const outside = `  const localLines = (localContent || "").split("\\n");
  const remoteLines = (remoteContent || "").split("\\n");
  const maxLines = Math.max(localLines.length, remoteLines.length);

  const diffRows = useMemo(() => {`;
const baseline = candidate.replace(inside, outside)
  .replace("}, [localContent, remoteContent]);", "}, [localLines, remoteLines, maxLines]);");
const hash = s => createHash("sha256").update(s).digest("hex");
// The second snapshot includes the independently merged blocked-conflict branch;
// DiffViewer itself is unchanged by that merge.
if (![
  "4917b3326a59a715199fc8fc304b2536b0faa9cefdaa505a64e8a8f59db33a51",
  "258f0e8fae840c00d5ba55a4e6a4bbb7c4e3298e4b5bbec4990109dab53ab05d",
].includes(hash(baseline)))
  throw Error("Baseline reconstruction mismatch; do not update this hash to hide drift");
let css = await fs.readFile("client/src/index.css", "utf8");
css = css.replace("@import './styles/design-tokens.css';",
  await fs.readFile("client/src/styles/design-tokens.css", "utf8"));
css = (await postcss([tailwind({ config: "./tailwind.config.ts" }), autoprefixer()])
  .process(css, { from: "client/src/index.css" })).css;
for (const [name, source] of Object.entries({ baseline, candidate })) {
  const js = await build({
    entryPoints: ["verification/conflict-diff/entry.tsx"], bundle: true, write: false,
    jsx: "automatic", format: "iife", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "measure-diff-only", setup(api) {
      api.onLoad({ filter: /\/ConflictResolutionDialog\.tsx$/ }, () => ({
        contents: source.replace("const diffRows = useMemo(() => {",
          "const diffRows = useMemo(() => { window.diffComputations = (window.diffComputations || 0) + 1;"),
        loader: "tsx",
      }));
    } }],
  });
  await fs.writeFile(`verification/conflict-diff/${name}.html`, `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; img-src data:">
<style>${css}</style><div id="root"></div><script>
const RealDate=Date;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:["2026-10-14T16:00:00Z"]))}static now(){return 1791993600000}};
${js.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script>`);
}
await fs.writeFile("../source-hashes.json", JSON.stringify({ baseline: hash(baseline), candidate: hash(candidate) }, null, 2));
