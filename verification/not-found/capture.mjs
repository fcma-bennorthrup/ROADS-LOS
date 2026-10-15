// Disposable-only CDP fixture. All browser requests are fulfilled locally or
// failed before reaching the network; no listening server or live app is used.
import { build } from "esbuild";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

assert(process.cwd().startsWith("/tmp/not-found-verification-"));
const output = path.resolve("../browser-evidence");
const fonts = path.resolve("../fonts");
await fs.mkdir(output, { recursive: true });
const aliases = Object.fromEntries(["loan-origination", "loan-decisioning", "loan-documents",
  "loan-closing-booking", "loan-history"].map(name =>
  [`@/pages/${name}`, path.resolve("verification/not-found/browser-probe.tsx")]));
await build({
  entryPoints: ["verification/not-found/browser-entry.tsx"], bundle: true,
  outfile: path.join(output, "fixture.js"), format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  alias: { ...aliases, "@": path.resolve("client/src") },
});
execFileSync("node", ["node_modules/tailwindcss/lib/cli.js", "-i", "client/src/index.css",
  "-o", path.join(output, "fixture.css")]);
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'none'; img-src 'self' data:">
<title>ROADS LOS - Loan Origination System</title>
<link rel="stylesheet" href="/fixture.css"><link rel="stylesheet" href="/fonts/fonts.css">
</head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`;
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu",
  "--remote-debugging-pipe", "--disable-background-networking", "--disable-extensions",
  "--disable-sync", "--no-first-run", "--no-default-browser-check",
  "--host-resolver-rules=MAP * ~NOTFOUND", `--user-data-dir=${output}/profile`, "about:blank"],
  { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
browser.stderr.resume();
let id = 0, buffer = "", fontsEnabled = true;
const pending = new Map(), errors = [], unexpected = [], captures = [], checks = [];
const hash = data => createHash("sha256").update(data).digest("hex");
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const next = ++id;
  pending.set(next, { resolve, reject });
  browser.stdio[3].write(JSON.stringify({ id: next, method, params, sessionId }) + "\0");
});
async function fulfill(message) {
  const { requestId, request } = message.params;
  const url = new URL(request.url);
  try {
    assert.equal(url.origin, "https://fallback.invalid");
    let data, type;
    if (url.pathname === "/fixture.js") {
      data = await fs.readFile(path.join(output, "fixture.js")); type = "text/javascript";
    } else if (url.pathname === "/fixture.css") {
      data = await fs.readFile(path.join(output, "fixture.css")); type = "text/css";
    } else if (url.pathname.startsWith("/fonts/")) {
      assert.match(url.pathname, /^\/fonts\/(?:fonts\.css|font-\d+\.(?:ttf|woff2?))$/);
      if (!fontsEnabled) {
        await send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }, message.sessionId);
        return;
      }
      data = await fs.readFile(path.join(fonts, path.basename(url.pathname)));
      type = url.pathname.endsWith(".css") ? "text/css" : "application/octet-stream";
    } else if (message.params.resourceType === "Document") {
      data = Buffer.from(html); type = "text/html";
    } else if (url.pathname === "/favicon.ico") {
      data = Buffer.alloc(0); type = "image/x-icon";
    } else throw new Error(`Unexpected fixture request ${url.pathname}`);
    await send("Fetch.fulfillRequest", { requestId, responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: type }, { name: "Cache-Control", value: "no-store" }],
      body: data.toString("base64") }, message.sessionId);
  } catch (error) {
    unexpected.push(String(error));
    await send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }, message.sessionId);
  }
}
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
    else if (message.method === "Fetch.requestPaused") void fulfill(message);
  }
});
const timer = setTimeout(() => { browser.kill(); throw new Error("Browser fixture timeout"); }, 240000);
try {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call("Page.enable"); await call("Runtime.enable");
  await call("Network.enable");
  await call("Network.setCacheDisabled", { cacheDisabled: true });
  await call("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await call("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const RealDate = Date;
    window.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : ["2026-10-14T16:00:00Z"])); }
      static now() { return 1791993600000; }
    };
  }` });
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const pause = () => new Promise(r => setTimeout(r, 100));
  const wait = expression => evaluate(`new Promise((resolve, reject) => {
    let n=0; const timer=setInterval(() => {
      if (${expression}) { clearInterval(timer); resolve(true); }
      else if (++n>150) { clearInterval(timer); reject("Fixture condition timed out: " + ${JSON.stringify(expression)}); }
    },20);
  })`);
  const load = async pathname => {
    await call("Page.navigate", { url: `https://fallback.invalid${pathname}` });
    await wait("window.fixture && document.querySelector('#root').children.length");
    await evaluate("document.fonts.ready");
    await pause();
  };
  const go = async pathname => {
    await evaluate(`window.fixture.navigate(${JSON.stringify(pathname)})`);
    await pause();
  };
  const click = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await pause();
  };
  const key = async (key, code, modifiers = 0) => {
    await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, modifiers });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers });
    await pause();
  };
  const capture = async name => {
    const { data } = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    const bytes = Buffer.from(data, "base64");
    await fs.writeFile(path.join(output, name), bytes);
    return hash(bytes);
  };
  const metadata = () => evaluate(`(() => {
    const h=document.querySelector('h1'), p=h.parentElement.parentElement.children[1];
    const card=p.parentElement.parentElement;
    const info=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {
      text:e.textContent.trim(),rect:[r.x,r.y,r.width,r.height],
      font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,
      color:s.color,background:s.backgroundColor,padding:s.padding,margin:s.margin,
      gap:s.gap,border:s.border,borderRadius:s.borderRadius
    }};
    return {heading:info(h),paragraph:info(p),card:info(card),
      icon:info(h.previousElementSibling),canvas:info(card.parentElement),
      viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
      controls:card.querySelectorAll('button,a,input,select,textarea,[tabindex]').length,
      fonts:Array.from(document.fonts).map(f=>({family:f.family,status:f.status})),
      unexpected:window.fixture.unexpected};
  })()`);
  for (const [width, height] of [[1440,900],[768,1024],[375,812],[1024,768],[390,844]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    for (const dark of [false, true]) for (const enlarged of [false, true]) for (const loaded of [false, true]) {
      fontsEnabled = loaded;
      const label = `${width}x${height}-${dark?"dark":"light"}-${enlarged?"200pct":"normal"}-${loaded?"fonts":"blocked"}`;
      let baseline;
      for (const phase of ["baseline", "candidate"]) {
        await load("/unknown");
        await evaluate(`document.documentElement.classList.toggle('dark',${dark});
          document.documentElement.style.fontSize=${JSON.stringify(enlarged ? "200%" : "")};`);
        await evaluate("document.fonts.ready"); await pause();
        const measured = await metadata();
        assert.equal(measured.heading.text, "404 Page Not Found");
        assert.equal(measured.paragraph.text, "Did you forget to add the page to the router?");
        assert.equal(measured.controls, 0);
        assert.deepEqual(measured.unexpected, []);
        assert.equal(measured.fonts.some(f => f.family.includes("Source Sans Pro") && f.status === "loaded"), loaded);
        const sha256 = await capture(`${label}-${phase}.png`);
        if (phase === "baseline") baseline = { measured, sha256 };
        else {
          assert.deepEqual(measured, baseline.measured, `${label} computed output changed`);
          assert.equal(sha256, baseline.sha256, `${label} pixels changed`);
        }
        captures.push({ name: `${label}-${phase}.png`, sha256, ...measured });
      }
    }
  }
  checks.push("40 paired scenarios: exact pixel hashes and measured DOM/layout match");
  fontsEnabled = true;
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await load("/unknown");
  await key("Tab", "Tab"); await key("Tab", "Tab", 8);
  assert.equal(await evaluate("document.activeElement.tagName"), "BODY");
  checks.push("Tab/Shift+Tab on bare fallback: body remains active; no page-owned tab stop");
  await load("/loans/a/history");
  await click("#save"); await click("#toggle");
  await go("/loans/a/unknown"); await go("/loans/a/history");
  assert.equal(await evaluate("document.querySelector('#panel').textContent"), "true");
  await go("/unknown");
  await evaluate("history.back()");
  await wait("document.querySelector('#panel')");
  assert.equal(await evaluate("document.querySelector('#panel').textContent"), "false");
  assert.equal(await evaluate("document.querySelector('#decision').textContent"), "complete");
  await evaluate("history.forward()");
  await wait("document.querySelector('h1')");
  assert.equal(await evaluate("location.pathname"), "/unknown");
  await call("Page.reload", { ignoreCache: true });
  await wait("window.fixture && document.querySelector('h1')");
  await go("/loans/a/history");
  assert.equal(await evaluate("document.querySelector('#decision').textContent"), "complete");
  assert.equal(await evaluate("document.querySelector('#panel').textContent"), "false");
  checks.push("Native browser Back/Forward, same-key retention, prototype remount, hard reload and storage restoration");
  await click("#open"); await wait("document.querySelector('[role=dialog]')");
  await go("/unknown");
  for (const modifiers of [0, 8]) {
    await key("Tab", "Tab", modifiers);
    assert(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"));
  }
  await capture("inherited-dialog.png");
  await key("Escape", "Escape");
  await wait("!document.querySelector('[role=dialog]')");
  assert.equal(await evaluate("document.activeElement.tagName"), "BODY");
  checks.push("Inherited dialog contains Tab/Shift+Tab focus; Escape closes; removed trigger restores focus to body");
  await go("/loans/a/history"); await click("#pull");
  await wait("window.fixture.finish");
  await go("/unknown"); await evaluate("window.fixture.finish()");
  await wait("document.querySelector('[role=dialog]')");
  assert(await evaluate("document.body.textContent.includes('Conflicts Detected')"));
  assert(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"));
  await capture("delayed-conflict-toast.png");
  await key("Escape", "Escape");
  await wait("!document.querySelector('[role=dialog]')");
  assert(await evaluate("document.body.textContent.includes('Conflicts Detected')"));
  assert.deepEqual(await evaluate("window.fixture.unexpected"), []);
  checks.push("Delayed fake 409 after navigation opens dialog/toast; toast survives Escape");
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  const result = { chromium: await send("Browser.getVersion"), checks, captures,
    errors, unexpected, bundle_sha256: hash(await fs.readFile(path.join(output, "fixture.js"))) };
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(checks.join("\n"), "\n", captures.length, "captures in", output);
} finally {
  clearTimeout(timer);
  browser.kill();
}
