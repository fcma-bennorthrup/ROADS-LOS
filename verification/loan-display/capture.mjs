// Isolated baseline/candidate browser comparison. Reuses the accepted inert admin adapter.
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const out = resolve("../captures");
await mkdir(out, { recursive: true });
execFileSync(process.execPath, ["node_modules/tailwindcss/lib/cli.js", "-i", "client/src/index.css", "-o", `${out}/style.css`]);
const pages = ["summary", "origination", "decisioning", "documents", "closing-booking", "history", "coming-soon"];
for (const pass of ["before", "after"]) {
  await build({
    entryPoints: ["verification/loan-display/browser.tsx"], bundle: true,
    outfile: `${out}/${pass}.js`, platform: "browser", format: "esm", jsx: "automatic",
    loader: { ".pdf": "file" },
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: pass === "before" ? [{
      name: "baseline-pages",
      setup(b) { b.onResolve({ filter: /\/pages\/loan-/ }, args => {
        const name = args.path.split("/loan-")[1];
        return { path: resolve(`client/src/pages/baseline-${name}.tsx`) };
      }); },
    }] : [],
    alias: { "@/components/GitHubSyncPanel": resolve("verification/coming-soon/inert-sync.tsx"),
      "@": resolve("client/src"), "@shared": resolve("shared"), "@assets": resolve("attached_assets") },
  });
  await writeFile(`${out}/${pass}.html`, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'">
<style>${await readFile(`${out}/style.css`, "utf8")}</style></head><body><div id="root"></div><script type="module">
${(await readFile(`${out}/${pass}.js`, "utf8")).replaceAll("</script", "<\\/script")}</script></body></html>`);
}
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--no-first-run",
  "--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-extensions",
  "--hide-scrollbars", "--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=<-loopback>",
  "--host-resolver-rules=MAP * ~NOTFOUND", `--user-data-dir=${out}/profile`,
  "--remote-debugging-pipe", "about:blank"], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
let next = 0, buffer = "";
const pending = new Map();
browser.stdio[4].on("data", chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf("\0")) >= 0) {
    const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    if (pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      pending.delete(message.id); clearTimeout(timer);
      message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  }
});
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => reject(Error(`CDP timeout ${method}`)), 15000);
    pending.set(id, { resolve, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
  });
}
const results = [];
let scenarioIndex = 0;
const startIndex = Number(process.argv[2] || 0);
const measure = `JSON.stringify({
 viewport: [innerWidth,innerHeight], html: document.getElementById("root").innerHTML,
 elements: [...document.querySelectorAll("#root *")].map(e => {
 const s = getComputedStyle(e), r = e.getBoundingClientRect();
 return [e.tagName,e.textContent,s.font,s.color,s.backgroundColor,s.padding,s.margin,s.display,
 s.overflow,[r.x,r.y,r.width,r.height],e.scrollHeight,e.scrollWidth];
 })})`;
try {
  for (const [width, height] of [[1440,900], [1024,768], [390,844], [767,844], [768,844], [1279,900], [1280,900]]) {
    for (const page of pages) for (const mode of ["loading", "error", "empty", "success"]) {
      if (scenarioIndex++ < startIndex) continue;
      const pair = [];
      for (const pass of ["before", "after"]) {
        const { targetId } = await send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
        const call = (m, p) => send(m, p, sessionId);
        await call("Page.enable");
        await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
        await call("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
        await call("Page.navigate", { url: `file://${out}/${pass}.html#${page}/${mode}` });
        await new Promise(r => setTimeout(r, 700));
        const evaluate = async expression => (await call("Runtime.evaluate", { expression, returnByValue: true })).result.value;
        assert.equal(await evaluate('document.body.dataset.ready'), "true");
        const data = JSON.parse(await evaluate(measure));
        assert.deepEqual(data.viewport, [width,height]);
        assert.ok(data.html.includes(mode === "loading" ? "loading-state" : ["error","empty"].includes(mode) ? "error-state" : "TEST-42"));
        const shots = [];
        const shot = async suffix => {
          const { data } = await call("Page.captureScreenshot", { format: "png" });
          const bytes = Buffer.from(data, "base64");
          await writeFile(`${out}/${page}-${mode}-${width}-${pass}-${suffix}.png`, bytes);
          shots.push(createHash("sha256").update(bytes).digest("hex"));
        };
        await shot("top");
        if (mode === "success") {
          await evaluate('[...document.querySelectorAll("#root *")].forEach(e => { if (e.scrollHeight > e.clientHeight) e.scrollTop = e.scrollHeight; })');
          // Let the browser paint programmatic scrolling before capturing pixels.
          await new Promise(r => setTimeout(r, 250));
          await shot("bottom");
          await evaluate('document.querySelector(\'[data-testid="toolbar-checklist"]\')?.focus()');
          await call("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
          await call("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
          await new Promise(r => setTimeout(r, 350));
          assert.equal(await evaluate('!!document.querySelector(\'[data-testid="checklist-panel"]\')'), true);
          data.overlay = JSON.parse(await evaluate(measure));
          await shot("checklist");
        }
        pair.push({ data, shots });
        await send("Target.closeTarget", { targetId });
      }
      // User accepted only these two observed one-pixel focus-outline differences.
      // All DOM/style/geometry and all other images remain strict comparisons.
      const approvedFocusPairs = {
        decisioning: new Set([
          "850463139c781266b2be6e26d84e087d6051e3a530b2fc6dd64cc4c9c687c081",
          "aab37d4be1016752202a446c625c7b95223460e3560124d1489d6fd52e8a8d1d",
        ]),
        "closing-booking": new Set([
          "d926c11a841b7e04907cedcf4991c297d82a82561925d3eec3d3d73bbfbddde9",
          "752f73e68d595ba73f4efbdf6ad77df98f01ff13b88f9842f706f75b3f1bb925",
        ]),
      };
      assert.deepEqual(pair[0].data, pair[1].data, `${page}/${mode}/${width} DOM`);
      let acceptedPixelException = false;
      const pixelFailures = [];
      pair[0].shots.forEach((hash, i) => {
        if (hash === pair[1].shots[i]) return;
        if (mode === "success" && width === 1024 && height === 768 && i === 2
          && approvedFocusPairs[page]?.has(hash) && approvedFocusPairs[page]?.has(pair[1].shots[i])) {
          acceptedPixelException = true;
        } else pixelFailures.push({ capture: i, before: hash, after: pair[1].shots[i] });
      });
      results.push({ page, mode, width, height, hashes: pair[1].shots, acceptedPixelException, pixelFailures });
      await writeFile(`${out}/results-${startIndex}.json`, JSON.stringify(results, null, 2));
      console.log(`${page}/${mode}/${width}: exact DOM/style/geometry; ${pixelFailures.length ? "PIXEL FAILURE" : acceptedPixelException ? "approved focus-pixel exception" : "PNG match"}`);
    }
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  assert.ok(results.every(r => !r.pixelFailures.length), "Unapproved pixel differences; see results.json");
} finally { browser.kill(); }
