// Isolated real FeesContent/Toaster, with in-memory loan state and a resolved flush.
// No application server, live data, GitHub calls, or dependency installation.
import { build } from "esbuild";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const output = path.resolve("generated-artifacts/fee-toast");
await fs.mkdir(output, { recursive: true });
await build({
  entryPoints: ["verification/fee-toast/browser.tsx"], bundle: true, write: true,
  outfile: `${output}/fixture.js`, platform: "browser", format: "iife",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{
    name: "isolated-fees",
    setup(b) {
      b.onResolve({ filter: /^@\/contexts\/loan-application-context$/ }, () => ({ path: "loan", namespace: "fixture" }));
      b.onResolve({ filter: /^@\/lib\/loan-application-store$/ }, () => ({ path: "store", namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: name }) => ({
        contents: name === "loan"
          ? 'import {useState} from "react"; export const useLoanState=(_key,value)=>useState(value); export const useLoanEditing=()=>{};'
          : 'export const applicationStore={flush:async()=>{}};',
        loader: "js", resolveDir: process.cwd(),
      }));
    },
  }],
});
execFileSync("node_modules/.bin/tailwindcss", ["-i", "client/src/index.css", "-o", `${output}/style.css`]);
const css = await fs.readFile(`${output}/style.css`, "utf8");
const js = await fs.readFile(`${output}/fixture.js`, "utf8");
await fs.writeFile(`${output}/index.html`, `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script>${js.replaceAll("</script", "<\\/script")}</script>`);

const browser = spawn(process.env.CHROMIUM_PATH || "chromium", [
  "--headless", "--no-sandbox", "--disable-gpu", "--disable-background-networking",
  "--host-resolver-rules=MAP * ~NOTFOUND", "--remote-debugging-pipe",
  `--user-data-dir=${output}/profile`,
], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
let sequence = 0, buffer = "";
const pending = new Map();
browser.stdio[4].on("data", chunk => {
  buffer += chunk;
  for (let end; (end = buffer.indexOf("\0")) >= 0;) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    if (pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      clearTimeout(timer); pending.delete(message.id);
      message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  }
});
function command(method, params = {}, sessionId) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Timed out: ${method}`)), 15000);
    pending.set(id, { resolve, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
  });
}
try {
  const { targetId } = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId, flatten: true });
  const evaluate = async expression => (await command("Runtime.evaluate", { expression, returnByValue: true }, sessionId)).result.value;
  const results = [];
  for (const width of [1440, 320]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await command("Page.navigate", { url: pathToFileURL(`${output}/index.html`).href }, sessionId);
    await new Promise(resolve => setTimeout(resolve, 500));
    const before = await evaluate(`JSON.stringify(document.querySelector('[data-testid="fees-actions"]').getBoundingClientRect())`);
    await evaluate(`(() => {
      const input=document.querySelector('[aria-label="Paid To"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Unadded draft');
      input.dispatchEvent(new Event('input',{bubbles:true}));
    })()`);
    await new Promise(resolve => setTimeout(resolve, 50));
    await evaluate(`document.querySelector('[data-testid="button-save-fee-table"]').click()`);
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await evaluate(`(() => {
      const toast=document.querySelector('[data-testid="toast-success"]'), style=getComputedStyle(toast);
      return {width:innerWidth, rect:toast.getBoundingClientRect().toJSON(), background:style.backgroundColor,
        accent:style.borderLeftColor, radius:style.borderRadius, shadow:style.boxShadow,
        text:toast.textContent, actions:JSON.stringify(document.querySelector('[data-testid="fees-actions"]').getBoundingClientRect())};
    })()`);
    assert.equal(result.width, width);
    assert.ok(result.rect.x >= 0 && result.rect.right <= width);
    assert.equal(result.actions, before);
    assert.equal(result.accent, "rgb(43, 182, 86)");
    assert.equal(result.background, "rgb(255, 255, 255)");
    assert.equal(result.radius, "4px");
    assert.match(result.text, /Add the current fee/);
    const image = await command("Page.captureScreenshot", { format: "png" }, sessionId);
    await fs.writeFile(`${output}/${width}.png`, Buffer.from(image.data, "base64"));
    results.push(result);
  }
  await fs.writeFile(`${output}/results.json`, JSON.stringify({ fontNote: "Source Sans Pro declared; offline system fallback used", results }, null, 2));
  console.log("Desktop and narrow captures passed; no layout movement.");
} finally {
  browser.kill();
}
