import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";
let css = await fs.readFile("client/src/index.css", "utf8");
css = css.replace("@import './styles/design-tokens.css';", await fs.readFile("client/src/styles/design-tokens.css", "utf8"));
css = (await postcss([tailwind({ config: "./tailwind.config.ts" }), autoprefixer()]).process(css, { from: "client/src/index.css" })).css;
for (const version of ["baseline", "candidate"]) {
  const result = await build({ entryPoints: ["verification/sync-snapshots/ui.tsx"], bundle: true,
    write: false, jsx: "automatic", format: "iife", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "baseline", setup(b) {
      b.onLoad({ filter: /(ConflictResolutionDialog\.tsx|use-github-sync\.ts)$/ }, async ({ path: file }) => ({
        contents: await fs.readFile(version === "baseline" ? path.join(process.argv[2], path.relative(process.cwd(), file)) : file, "utf8"),
        loader: file.endsWith("tsx") ? "tsx" : "ts", resolveDir: path.dirname(file),
      }));
    } }],
  });
  await fs.writeFile(`verification/sync-snapshots/${version}.html`, `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; img-src data:">
<style>${css}</style><div id="root"></div><script>
const RealDate=Date;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:["2026-10-14T16:00:00Z"]))}static now(){return 1791993600000}};
${result.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script>`);
}
