import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";
let css = await fs.readFile("client/src/index.css", "utf8");
css = css.replace("@import './styles/design-tokens.css';", await fs.readFile("client/src/styles/design-tokens.css", "utf8"));
css = (await postcss([tailwind({ config: "./tailwind.config.ts" }), autoprefixer()]).process(css, { from: "client/src/index.css" })).css;
for (const name of ["baseline", "candidate"]) {
  const source = await fs.readFile(name === "baseline"
    ? path.join(process.argv[2], "client/src/components/GitHubSyncPanel.tsx")
    : "client/src/components/GitHubSyncPanel.tsx", "utf8");
  const js = await build({ entryPoints: ["verification/sync-recovery/ui.tsx"], bundle: true,
    write: false, jsx: "automatic", format: "iife", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "panel", setup(b) {
      b.onLoad({ filter: /GitHubSyncPanel\.tsx$/ }, () => ({ contents: source,
        loader: "tsx", resolveDir: path.resolve("client/src/components") }));
    } }],
  });
  await fs.writeFile(`verification/sync-recovery/${name}.html`,
    `<!doctype html><meta charset="utf-8"><style>${css}</style><div id="root"></div><script>${js.outputFiles[0].text}</script>`);
}
