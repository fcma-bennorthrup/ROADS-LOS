// Run from the disposable parent directory created by run.py.
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const out = resolve("captures");
await mkdir(out, { recursive: true });
for (const pass of ["baseline", "candidate"]) {
  const root = resolve(pass);
  execFileSync(process.execPath, [resolve(root, "node_modules/tailwindcss/lib/cli.js"),
    "-i", "client/src/index.css", "-o", `${out}/${pass}-utilities.css`], { cwd: root });
  await build({
    absWorkingDir: root, entryPoints: ["verification/package-progress/browser.tsx"],
    bundle: true, outfile: `${out}/${pass}.js`, platform: "browser", format: "esm", jsx: "automatic",
    loader: { ".pdf": "file" }, define: { "process.env.NODE_ENV": '"production"' },
    alias: { "@/components/GitHubSyncPanel": resolve(root, "verification/coming-soon/inert-sync.tsx"),
      "@": resolve(root, "client/src"), "@shared": resolve(root, "shared"), "@assets": resolve(root, "attached_assets") },
  });
  await writeFile(`${out}/${pass}.html`, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'">
<style>${await readFile(`${out}/${pass}-utilities.css`, "utf8")}\n${await readFile(`${out}/${pass}.css`, "utf8")}</style></head><body><div id="root"></div><script type="module">
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
    const item = pending.get(message.id);
    if (item) {
      pending.delete(message.id); clearTimeout(item.timer);
      message.error ? item.reject(Error(JSON.stringify(message.error))) : item.resolve(message.result);
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
const measure = `JSON.stringify({
 viewport: [innerWidth,innerHeight],
 elements: [...document.querySelectorAll("#root *")].map(e => {
 const s = getComputedStyle(e), r = e.getBoundingClientRect();
 return [e.tagName,e.textContent,e.getAttribute("aria-disabled"),e.getAttribute("disabled"),
 s.font,s.color,s.backgroundColor,s.padding,s.margin,s.display,s.overflow,
 [r.x,r.y,r.width,r.height],e.scrollHeight,e.scrollWidth]; }),
 focus: document.activeElement?.textContent,
 opens: window.packageFixture.opens
})`;
const results = [];
try {
  for (const [width, height] of [[1440,900], [1024,768], [390,844], [767,844], [768,844]]) {
    for (const mode of ["idle", "generating", "generated", "delivered", "error", "write-error"]) {
      const pair = [];
      for (const pass of ["baseline", "candidate"]) {
        const { targetId } = await send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
        const call = (m, p) => send(m, p, sessionId);
        await call("Page.enable");
        await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
        await call("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
        await call("Page.navigate", { url: `file://${out}/${pass}.html#${mode}` });
        const evaluate = async expression => {
          const result = await call("Runtime.evaluate", { expression, returnByValue: true });
          if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
          return result.result.value;
        };
        await new Promise(r => setTimeout(r, 600));
        await evaluate(`document.querySelector('[data-testid="sidebar-item-closing-documents"]')?.click()`);
        // Sidebar IDs are verified by visible text rather than assumed in the fixture.
        await evaluate(`[...document.querySelectorAll("button")].find(e => e.textContent.trim() === "Closing Documents")?.click()`);
        await new Promise(r => setTimeout(r, 150));
        await evaluate(`document.querySelector('[role="tab"]')?.focus()`);
        await call("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
        await call("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
        await new Promise(r => setTimeout(r, 150));
        assert.equal(await evaluate(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent`), "Closing Package");
        if (mode === "write-error") {
          await evaluate(`[...document.querySelectorAll("button")].find(e => e.textContent.trim() === "Deliver Closing Package").click()`);
          await new Promise(r => setTimeout(r, 50));
        }
        if (["generated", "delivered", "write-error"].includes(mode)) {
          await evaluate(`[...document.querySelectorAll("button")].find(e => e.textContent.trim() === "View Closing Package").focus()`);
          await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
          await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        }
        // Preserve production transitions; measure only after they have settled.
        await new Promise(r => setTimeout(r, 600));
        const data = JSON.parse(await evaluate(measure));
        assert.deepEqual(data.viewport, [width,height]);
        const shots = [];
        for (const position of ["top", "bottom"]) {
          if (position === "bottom") {
            await evaluate('[...document.querySelectorAll("#root *")].forEach(e => { if (e.scrollHeight > e.clientHeight) e.scrollTop = e.scrollHeight; })');
            await new Promise(r => setTimeout(r, 100));
          }
          const { data: image } = await call("Page.captureScreenshot", { format: "png" });
          const bytes = Buffer.from(image, "base64");
          await writeFile(`${out}/${mode}-${width}-${pass}-${position}.png`, bytes);
          shots.push(createHash("sha256").update(bytes).digest("hex"));
        }
        pair.push({ data, shots });
        await send("Target.closeTarget", { targetId });
      }
      assert.deepEqual(pair[0], pair[1], `${mode}/${width} visual or interaction mismatch`);
      results.push({ mode, width, height, equal: true, hashes: pair[1].shots });
      console.log(mode, width, "equal");
      await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
    }
  }
} finally { browser.kill(); }
