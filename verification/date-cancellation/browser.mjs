// Dependency-free CDP driver. Run only against run.py's disposable copies.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const work = process.argv[2];
assert(work?.startsWith("/tmp/date-cancellation-"));
const delay = ms => new Promise(r => setTimeout(r, ms));
const env = { PATH: process.env.PATH, HOME: `${work}/home`, TZ: "UTC", LANG: "C.UTF-8" };
const children = [];
const results = [];
await mkdir(`${work}/browser`, { recursive: true });
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    try { return await (await fetch(url)).json(); } catch { await delay(100); }
  }
  throw new Error(`Not ready: ${url}`);
}
try {
  for (const [name, port] of [["baseline", 4317], ["candidate", 4318]]) {
    children.push(spawn("node", ["node_modules/vite/bin/vite.js", "--config",
      "verification/origination/browser/vite.config.ts", "--port", String(port)],
      { cwd: `${work}/${name}`, env, stdio: "ignore" }));
  }
  children.push(spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu",
    "--disable-background-networking", "--no-first-run", "--remote-debugging-port=9333",
    `--user-data-dir=${work}/chromium`, "about:blank"], { env, stdio: "ignore" }));
  const targets = await ready("http://127.0.0.1:9333/json");
  const ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  }
  ws.addEventListener("message", async event => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    } else if (m.method === "Fetch.requestPaused") {
      const allowed = /^http:\/\/localhost:431[78]\//.test(m.params.request.url);
      await send(allowed ? "Fetch.continueRequest" : "Fetch.failRequest",
        { requestId: m.params.requestId, ...(!allowed && { errorReason: "BlockedByClient" }) });
    }
  });
  const evaluate = async expression => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const click = async testId => { await evaluate(`document.querySelector('[data-testid="${testId}"]').click()`); await delay(150); };
  const value = () => evaluate(`document.querySelector('[data-testid="input-lock-date"]').value`);
  const change = async text => {
    await evaluate(`(()=>{const e=document.querySelector('[data-testid="input-lock-date"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await delay(100);
  };
  const escape = async () => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await delay(200);
  };
  await send("Page.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await send("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    const NativeDate=Date;window.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:["2026-10-14T16:00:00Z"]));}static now(){return new NativeDate("2026-10-14T16:00:00Z").getTime();}};
    window.fetch=()=>{throw Error("EXTERNAL_BLOCKED")};window.WebSocket=class{constructor(){throw Error("EXTERNAL_BLOCKED")}};XMLHttpRequest.prototype.open=()=>{throw Error("EXTERNAL_BLOCKED")};window.open=()=>{throw Error("EXTERNAL_BLOCKED")};
  ` });
  for (const [width, height] of [[1440,900],[1024,768],[390,844]]) {
    const captures = {};
    for (const [name, port] of [["baseline",4317],["candidate",4318]]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: `http://localhost:${port}/loans/synthetic-a/origination?section=Product+%26+Pricing` });
      for (let i = 0; i < 100; i++) {
        if (await evaluate(`!!document.querySelector('[data-testid="button-lock-rate"]')`)) break;
        await delay(100);
      }
      await evaluate("localStorage.clear()");
      await send("Page.reload");
      await delay(1000);
      assert.deepEqual(await evaluate("[innerWidth,innerHeight]"), [width,height]);
      const snapshots = {};
      async function capture(state) {
        await delay(500);
        snapshots[state] = await evaluate(`(()=>{const root=document.querySelector('[data-testid="rate-lock-modal"]')||document.querySelector('[data-testid="product-pricing-content"]');return [...root.querySelectorAll('*')].map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return [e.tagName,e.textContent,e.value??null,e.disabled??null,[r.x,r.y,r.width,r.height],s.fontFamily,s.fontSize,s.fontWeight,s.color,s.backgroundColor,s.padding,s.margin,s.overflow,s.borderRadius]})})()`);
        const { data } = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(`${work}/browser/${name}-${width}-${state}.png`, Buffer.from(data, "base64"));
        snapshots[`${state}-pixels`] = createHash("sha256").update(data).digest("hex");
      }
      await capture("page");
      await click("button-lock-rate");
      await capture("initial");
      assert.equal(await value(), "11/28/2026");
      await click("button-confirm-lock-rate");
      await click("button-lock-rate");
      await capture("edit");
      await change("10/19/2026");
      await click("input-lock-date-calendar-btn");
      await capture("calendar");
      await escape();
      const afterEscape = await evaluate(`({modal:!!document.querySelector('[data-testid="rate-lock-modal"]'),calendar:!!document.querySelector('[data-testid="input-lock-date-calendar"]'),focus:document.activeElement?.getAttribute('data-testid')})`);
      // Preserve actual baseline Escape propagation, not an invented two-stage policy.
      if (afterEscape.modal) await click("button-cancel-lock");
      await click("button-lock-rate");
      assert.equal(await value(), name === "candidate" ? "11/28/2026" : "10/19/2026");
      await change("10/20/2026");
      await click("button-confirm-lock-rate");
      await click("button-lock-rate");
      assert.equal(await value(), "10/20/2026");
      await capture("confirmed");
      snapshots.escape = afterEscape;
      captures[name] = snapshots;
    }
    for (const state of ["page","initial","edit","calendar","confirmed","escape"]) {
      assert.deepEqual(captures.candidate[state], captures.baseline[state], `${width} ${state}`);
      if (state !== "escape") assert.equal(captures.candidate[`${state}-pixels`], captures.baseline[`${state}-pixels`], `${width} ${state} pixels`);
    }
    results.push({ width,height,equivalent:true,escape:captures.candidate.escape });
  }
  await writeFile(`${work}/browser/results.json`, JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
  ws.close();
} finally {
  for (const child of children) child.kill("SIGTERM");
}
