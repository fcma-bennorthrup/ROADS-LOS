// Disposable file origin, CDP pipes, and blocked network; never the live App.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const [browser, copy, output] = process.argv.slice(2);
await fs.mkdir(output, { recursive: true });
const child = spawn(browser, ["--headless", "--no-sandbox", "--disable-gpu",
  "--no-proxy-server", "--host-resolver-rules=MAP * ~NOTFOUND", "--disable-background-networking",
  "--disable-component-update", "--disable-sync", "--no-first-run", "--disable-extensions",
  `--user-data-dir=${output}/profile`, "--remote-debugging-pipe"], { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
child.stderr.resume();
let id = 0, buffer = "";
const pending = new Map();
child.stdio[4].on("data", chunk => {
  buffer += chunk;
  for (let end; (end = buffer.indexOf("\0")) !== -1;) {
    const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    const p = pending.get(message.id);
    if (p) { pending.delete(message.id); clearTimeout(p.timer); message.error ? p.reject(Error(JSON.stringify(message.error))) : p.resolve(message.result); }
  }
});
function command(method, params = {}, sessionId) {
  const next = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Timeout: ${method}`)), 15000);
    pending.set(next, { resolve, reject, timer });
    child.stdio[3].write(JSON.stringify({ id: next, method, params, sessionId }) + "\0");
  });
}
const results = [];
try {
  const { targetId } = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId, flatten: true });
  const cmd = (method, params) => command(method, params, sessionId);
  async function evaluate(expression) {
    const r = await cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  await cmd("Page.enable");
  await cmd("Network.enable");
  await cmd("Network.setBlockedURLs", { urls: ["http://*", "https://*", "ws://*", "wss://*"] });
  await cmd("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
    await cmd("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await cmd("Page.navigate", { url: pathToFileURL(path.join(copy, "verification/loan-path/browser.html")).href });
    for (let i = 0; i < 100 && !await evaluate('!!document.querySelector("[data-testid=loan-header]")'); i++)
      await new Promise(r => setTimeout(r, 50));
    assert(await evaluate('!!document.querySelector("[data-testid=loan-header]")'));
    for (const mode of ["initial", "edit", "saved", "activity", "checklist"]) {
      const click = id => evaluate(`document.querySelector('[data-testid="${id}"]').click()`);
      if (mode === "edit") await click("address-button-edit");
      if (mode === "saved") await click("address-button-save");
      if (mode === "activity") await click("button-sidebar-toggle");
      if (mode === "checklist") {
        await click("button-sidebar-toggle");
        await click("toolbar-checklist");
        await evaluate('window.scrollTo(0,document.body.scrollHeight)');
      }
      await evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
      // Retain existing CSS/animations; capture their settled state, not a
      // wall-clock-dependent frame partway through a transition.
      await new Promise(r => setTimeout(r, 1200));
      const data = await evaluate(`(() => {
        const root=document.getElementById("root");
        return {viewport:[innerWidth,innerHeight],html:root.innerHTML,scroll:[scrollX,scrollY],
          styles:[...root.querySelectorAll("*")].map(e=>{
            const c=getComputedStyle(e),r=e.getBoundingClientRect();
            return [e.tagName,r.x,r.y,r.width,r.height,c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,
              c.color,c.backgroundColor,c.padding,c.margin,c.gap,c.overflow];
          })};
      })()`);
      assert.deepEqual(data.viewport, [width, height]);
      const image = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const bytes = Buffer.from(image.data, "base64"), name = `${width}-${mode}.png`;
      await fs.writeFile(`${output}/${name}`, bytes);
      results.push({ name, ...data, imageHash: createHash("sha256").update(bytes).digest("hex") });
    }
  }
  await fs.writeFile(`${output}/results.json`, JSON.stringify(results));
} finally { child.kill(); }
