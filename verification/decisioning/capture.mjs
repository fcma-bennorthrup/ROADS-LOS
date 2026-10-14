// Run only inside the disposable copy made by run.py.
// Uses existing locked esbuild/ws-free CDP pipe and the installed Chromium.
import { build } from "esbuild";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

if (!process.cwd().startsWith("/tmp/decisioning-verification-"))
  throw new Error("Disposable copy required");
const output = path.resolve("../browser-evidence");
await fs.mkdir(output, { recursive: true });
await build({
  entryPoints: ["verification/decisioning/browser-entry.tsx"], bundle: true,
  outfile: path.join(output, "fixture.js"), format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  alias: {
    "@/components/GitHubSyncPanel": path.resolve("verification/decisioning/admin-inert.tsx"),
    "@": path.resolve("client/src"),
  },
});
execFileSync("node", ["node_modules/tailwindcss/lib/cli.js", "-i", "client/src/index.css",
  "-o", path.join(output, "fixture.css")]);
await fs.writeFile(path.join(output, "index.html"), `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'">
<link rel="stylesheet" href="fixture.css"></head><body><div id="root"></div><script src="fixture.js"></script></body></html>`);
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu",
  "--remote-debugging-pipe", "--disable-background-networking", "--disable-extensions",
  "--disable-sync", "--no-first-run", "--no-default-browser-check",
  "--host-resolver-rules=MAP * ~NOTFOUND", "--allow-file-access-from-files",
  `--user-data-dir=${output}/profile`, "about:blank"],
  { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
browser.stderr.resume();
let id = 0, buffer = "";
const pending = new Map();
const errors = [];
browser.stdio[4].on("data", chunk => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf("\0")) >= 0) {
    const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    if (message.id) {
      const waiter = pending.get(message.id); pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(JSON.stringify(message.error)));
      else waiter?.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params);
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const next = ++id;
  pending.set(next, { resolve, reject });
  browser.stdio[3].write(JSON.stringify({ id: next, method, params, sessionId }) + "\0");
});
const timer = setTimeout(() => { browser.kill(); throw new Error("Browser capture timed out"); }, 90000);
const evidence = [];
try {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
  const evaluate = async expression => {
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = selector => evaluate(`new Promise((resolve, reject) => {
    let tries = 0; const timer = setInterval(() => {
      if (document.querySelector(${JSON.stringify(selector)})) { clearInterval(timer); resolve(true); }
      if (++tries > 150) { clearInterval(timer); reject("Missing fixture element"); }
    }, 20);
  })`);
  const click = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click', {bubbles:true}))`);
    await new Promise(r => setTimeout(r, 60));
  };
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: `file://${output}/index.html` });
    await wait('[data-testid="loan-decisioning-page"]');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Borrower Financials').click()`);
    await wait('[data-testid="borrower-financials-content"]');
    for (const state of ["income", "balance-menu", "panels"]) {
      if (state === "balance-menu") {
        await click('[data-testid="balance-sheet-row-current-assets"] [data-testid="button-edit-asset-0"]');
        await click('[data-testid="balance-sheet-row-current-assets"] [data-testid="button-more-liability-0"]');
        await evaluate(`document.querySelector('[data-testid="balance-sheet-row-current-assets"]').scrollIntoView({block:'start'})`);
      }
      if (state === "panels") {
        await click('[data-testid="toolbar-checklist"]');
        await click('[data-testid="button-sidebar-toggle"]');
      }
      const metadata = await evaluate(`({
        title: document.querySelector('[data-testid="heading-borrower-financials"]').textContent,
        font: getComputedStyle(document.querySelector('[data-testid="heading-borrower-financials"]')).fontFamily,
        scroll: document.querySelector('[data-testid="borrower-financials-content"]').parentElement.scrollTop,
        columns: getComputedStyle(document.querySelector('[data-testid="balance-sheet-row-current-assets"]')).gridTemplateColumns,
        fontPolicy: 'remote fonts blocked; existing CSS fallback only'
      })`);
      const { data } = await call("Page.captureScreenshot", { format: "png" });
      const name = `${width}x${height}-${state}.png`;
      await fs.writeFile(path.join(output, name), Buffer.from(data, "base64"));
      evidence.push({ name, width, height, state, ...metadata });
    }
  }
  if (errors.length) throw new Error(JSON.stringify(errors));
  await fs.writeFile(path.join(output, "captures.json"), JSON.stringify(evidence, null, 2));
  console.log(output, evidence.length, "captures; no uncaught browser exceptions");
} finally {
  clearTimeout(timer);
  browser.kill();
}
