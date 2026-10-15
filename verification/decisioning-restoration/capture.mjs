import { build } from "esbuild";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

assert(process.cwd().startsWith("/tmp/decisioning-restoration-"));
const phase = process.env.RESTORATION_PHASE;
const restored = phase === "candidate";
const output = path.resolve("../browser");
await fs.mkdir(output, { recursive: true });
await build({
  entryPoints: ["verification/decisioning-restoration/browser.tsx"], bundle: true,
  outfile: path.join(output, "fixture.js"), format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  alias: { "@/components/GitHubSyncPanel": path.resolve("verification/decisioning/admin-inert.tsx"),
    "@": path.resolve("client/src") },
});
execFileSync("node", ["node_modules/tailwindcss/lib/cli.js", "-i", "client/src/index.css", "-o", path.join(output, "fixture.css")]);
await fs.writeFile(path.join(output, "index.html"), `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'">
<link rel="stylesheet" href="fixture.css"></head><body><div id="root"></div><script src="fixture.js"></script></body></html>`);
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu",
  "--remote-debugging-pipe", "--disable-background-networking", "--disable-extensions", "--disable-sync",
  "--no-first-run", "--no-default-browser-check", "--host-resolver-rules=MAP * ~NOTFOUND",
  "--allow-file-access-from-files", `--user-data-dir=${output}/profile-${phase}`, "about:blank"],
  { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
browser.stderr.resume();
let id = 0, buffer = "";
const pending = new Map(), errors = [], evidence = [];
browser.stdio[4].on("data", chunk => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf("\0")) >= 0) {
    const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    if (message.id) {
      const waiter = pending.get(message.id); pending.delete(message.id);
      if (message.error) waiter?.reject(message.error); else waiter?.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params);
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const next = ++id; pending.set(next, { resolve, reject });
  browser.stdio[3].write(JSON.stringify({ id: next, method, params, sessionId }) + "\0");
});
const timer = setTimeout(() => { browser.kill(); throw new Error("Capture timeout"); }, 120000);
try {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call("Page.enable"); await call("Runtime.enable");
  await call("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const settle = () => new Promise(r => setTimeout(r, 120));
  const wait = async id => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`!!document.querySelector('[data-testid="${id}"]')`)) return;
      await settle();
    }
    throw new Error("Missing " + id);
  };
  const click = async id => {
    await evaluate(`document.querySelector('[data-testid="${id}"]').click()`); await settle();
  };
  const nav = async route => {
    await evaluate(`fixture.navigate(${JSON.stringify(route)})`); await settle();
  };
  const check = async (approved, generated) => {
    assert.equal(await evaluate(`document.querySelector('[data-testid="text-loan-decision-value"]').textContent`), approved ? "Loan Approved" : "--");
    assert.equal(await evaluate(`document.querySelector('[data-testid="button-view-decision-letter"]').getAttribute('aria-disabled')`), String(!generated));
    assert.equal(await evaluate(`document.querySelector('[data-testid="text-credit-score-value"]').textContent`), "--");
  };
  const capture = async (name, equivalent) => {
    const contract = await evaluate(`Array.from(document.querySelector('[data-testid="decisioning-summary-content"]').querySelectorAll('*')).map(e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return {tag:e.tagName,text:e.children.length ? null : e.textContent,cls:e.className,style:e.getAttribute('style'),
        disabled:e.getAttribute('aria-disabled'),font:s.font,fontFamily:s.fontFamily,color:s.color,background:s.backgroundColor,
        gap:s.gap,padding:s.padding,border:s.border,rect:[r.x,r.y,r.width,r.height]};
    })`);
    const { data } = await call("Page.captureScreenshot", { format: "png" });
    const bytes = Buffer.from(data, "base64");
    await fs.writeFile(path.join(output, `${phase}-${name}.png`), bytes);
    evidence.push({ name, equivalent, contract, sha256: createHash("sha256").update(bytes).digest("hex") });
  };
  for (const [width, height] of [[1440,900], [1024,768], [390,844]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    for (const stage of ["approve", "generate", "deliver"]) {
      const name = `${width}-${stage}`;
      await call("Page.navigate", { url: `file://${output}/index.html?fresh` });
      await wait("decisioning-summary-content"); await settle();
      assert.deepEqual(await evaluate(`[innerWidth,innerHeight]`), [width,height]);
      await capture(`${name}-fresh`, true);
      await click("button-decision-loan");
      // Dismiss the existing approval toast before equivalence screenshots.
      await evaluate(`document.querySelector('[toast-close]')?.click()`);
      // Wait for the actual exit animation/unmount, not an arbitrary frame.
      // Otherwise the unchanged toast can be caught halfway off-screen.
      for (let i = 0; i < 100; i++) {
        if (await evaluate(`document.querySelectorAll('[role="status"]').length === 0`)) break;
        await settle();
      }
      assert.equal(await evaluate(`document.querySelectorAll('[role="status"]').length`), 0);
      if (stage !== "approve") await click("button-generate-decision-letter");
      if (stage === "deliver") await click("button-deliver-decision-letter");
      await settle(); await capture(`${name}-mounted`, true);
      const activity = await evaluate(`localStorage.getItem('loan-runtime-activity:fixture-a')`);
      await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Borrower Financials').click()`);
      await wait("borrower-financials-content");
      await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Decisioning Summary').click()`);
      await wait("decisioning-summary-content"); await settle();
      await check(restored, restored && stage !== "approve");
      await capture(`${name}-returned`, false);
      await nav("/loans/fixture-a/history"); await wait("away");
      await nav("/loans/fixture-a/decisioning"); await wait("decisioning-summary-content");
      await check(restored, restored && stage !== "approve");
      await nav("/loans/fixture-b/decisioning"); await wait("decisioning-summary-content");
      await check(false, false);
      await nav("/loans/fixture-a/decisioning"); await wait("decisioning-summary-content");
      await check(restored, restored && stage !== "approve");
      // Real document reload, same disposable origin/storage, no fresh reset.
      await call("Page.navigate", { url: `file://${output}/index.html` });
      await wait("decisioning-summary-content"); await settle();
      await call("Page.reload");
      await wait("decisioning-summary-content"); await settle();
      await check(restored, restored && stage !== "approve");
      assert.equal(await evaluate(`localStorage.getItem('loan-runtime-activity:fixture-a')`), activity);
      assert.equal(await evaluate(`document.querySelectorAll('[role="status"]').length`), 0);
      await click("button-view-decision-letter");
      assert.deepEqual(await evaluate(`fixture.opens`), restored && stage !== "approve" ? [["/decision-letter.pdf","_blank"]] : []);
      // aria-disabled controls stay in the native tab order in both versions.
      await evaluate(`document.querySelector('[data-testid="button-generate-decision-letter"]').focus()`);
      await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      assert.equal(await evaluate(`document.activeElement.dataset.testid`), "button-view-decision-letter");
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, `${phase}.json`), JSON.stringify(evidence, null, 2));
  if (restored) {
    const before = JSON.parse(await fs.readFile(path.join(output, "baseline.json")));
    for (const record of evidence.filter(r => r.equivalent)) {
      const original = before.find(r => r.name === record.name);
      assert.deepEqual(record.contract, original.contract, record.name + " DOM/styles");
      assert.equal(record.sha256, original.sha256, record.name + " pixels");
    }
  }
  console.log(phase, evidence.length, "captures; route/sidebar/reload/loans/PDF/focus passed");
} finally { clearTimeout(timer); browser.kill(); }
