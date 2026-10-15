// Run in the disposable copy after locked installation. No server or live App.
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";

const out = resolve("../captures");
await mkdir(out, { recursive: true });
execFileSync(process.execPath, ["node_modules/tailwindcss/lib/cli.js", "-i", "client/src/index.css", "-o", `${out}/style.css`]);
await build({
  entryPoints: ["verification/coming-soon/browser.tsx"], bundle: true,
  outfile: `${out}/fixture.js`, platform: "browser", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "@/components/GitHubSyncPanel": resolve("verification/coming-soon/inert-sync.tsx"),
    "@": resolve("client/src"), "@shared": resolve("shared"),
  },
});
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'">
<style>${await readFile(`${out}/style.css`, "utf8")}</style></head><body><div id="root"></div><script>
${(await readFile(`${out}/fixture.js`, "utf8")).replaceAll("</script", "<\\/script")}
</script></body></html>`;
await writeFile(`${out}/fixture.html`, html);
// CDP over anonymous pipes (no debugging port) sets the actual content viewport.
// --window-size alone is NOT a viewport contract: browser chrome/minimum width alters it.
const browser = spawn("chromium", [
      "--headless", "--no-sandbox", "--disable-gpu", "--no-first-run", "--disable-background-networking",
      "--disable-component-update", "--disable-sync", "--disable-extensions", "--hide-scrollbars",
      "--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=<-loopback>",
      "--host-resolver-rules=MAP * ~NOTFOUND", `--user-data-dir=${out}/pipe-profile`,
      "--remote-debugging-pipe", "about:blank",
], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
let next = 0, buffer = "";
const pending = new Map();
browser.stdio[4].on("data", chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf("\0")) >= 0) {
    const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      pending.delete(message.id); clearTimeout(timer);
      if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
    }
  }
});
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 15000);
    pending.set(id, { resolve, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
  });
}
const results = [];
const requestedModes = process.argv.slice(2);
const modes = requestedModes.length ? requestedModes :
  ["loading", "error", "success", "long", "checklist", "checklist-end", "focus"];
try {
  for (const [width, height] of [[1440,900], [1024,768], [390,844]]) {
    for (const mode of modes) {
      const name = `${mode}-${width}x${height}`;
      const hashes = [];
      for (const pass of ["before", "after"]) {
        const { targetId } = await send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
        const call = (method, params) => send(method, params, sessionId);
        await call("Page.enable");
        await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
        await call("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
        await call("Page.navigate", { url: `file://${out}/fixture.html#${mode === "checklist-end" ? "checklist" : mode}` });
        // Fonts are deliberately blocked; wait for React, query, animation and evidence timer.
        await new Promise(resolve => setTimeout(resolve, 1100));
        const { result } = await call("Runtime.evaluate", {
          expression: 'document.getElementById("fixture-evidence")?.textContent', returnByValue: true,
        });
        if (!result.value) throw new Error(`Fixture failed: ${name}`);
        const measurement = JSON.parse(result.value);
        if (measurement.viewport[0] !== width || measurement.viewport[1] !== height)
          throw new Error(`Viewport mismatch: ${name}`);
        if (mode === "focus") {
          const space = async () => {
            await call("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
            await call("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
            await new Promise(resolve => setTimeout(resolve, 250));
          };
          await space();
          const opened = await call("Runtime.evaluate", { expression: '!!document.querySelector(\'[data-testid="checklist-panel"]\')', returnByValue: true });
          if (!opened.result.value) throw new Error("Native Space did not open checklist");
          await space();
          const closed = await call("Runtime.evaluate", { expression: '!!document.querySelector(\'[data-testid="checklist-panel"]\')', returnByValue: true });
          if (closed.result.value) throw new Error("Native Space did not close checklist");
          measurement.keyboard = "Native Space opens then closes focused checklist button";
        }
        if (mode === "checklist-end") {
          const scrolled = await call("Runtime.evaluate", {
            expression: `(() => { const panel = document.querySelector('[data-testid="checklist-panel"]');
              const body = panel.lastElementChild; body.scrollTop = body.scrollHeight;
              return { top: body.scrollTop, height: body.scrollHeight, visible: body.clientHeight }; })()`,
            returnByValue: true,
          });
          measurement.mode = mode;
          measurement.scroll = scrolled.result.value;
        }
        if (pass === "after") results.push(measurement);
        const shot = await call("Page.captureScreenshot", { format: "png" });
        const bytes = Buffer.from(shot.data, "base64");
        await writeFile(`${out}/${name}-${pass}.png`, bytes);
        hashes.push(createHash("sha256").update(bytes).digest("hex"));
        await send("Target.closeTarget", { targetId });
      }
      if (hashes[0] !== hashes[1]) throw new Error(`Nonrepeatable pixels: ${name}`);
      console.log(name, "identical", hashes[0]);
    }
  }
  await writeFile(`${out}/measurements${requestedModes.length ? "-extra" : ""}.json`, JSON.stringify(results, null, 2));
} finally {
  browser.kill();
}
