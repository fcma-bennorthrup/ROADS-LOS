// CDP over inherited pipes only: no debugging port, web server, or new package.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";

const [browser, copy, output] = process.argv.slice(2);
const child = spawn(browser, [
  "--headless", "--no-sandbox", "--disable-gpu", "--no-proxy-server",
  "--host-resolver-rules=MAP * ~NOTFOUND", "--disable-background-networking",
  "--disable-component-update", "--disable-sync", "--no-first-run", "--disable-extensions",
  `--user-data-dir=${output}/profile`, "--remote-debugging-pipe",
], { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
let log = "";
child.stderr.on("data", chunk => { log += chunk; });
let counter = 0, buffer = "";
const pending = new Map();
child.stdio[4].on("data", chunk => {
  buffer += chunk.toString();
  for (let end; (end = buffer.indexOf("\0")) !== -1;) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      clearTimeout(waiter.timeout);
      message.error ? waiter.reject(Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
    }
  }
});
function command(method, params = {}, sessionId) {
  const id = ++counter;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(Error(`Timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    child.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
  });
}
const results = { font_state: "External font loading blocked; system fallback only", captures: [] };
try {
  results.browser = await command("Browser.getVersion");
  const { targetId } = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId, flatten: true });
  await command("Page.enable", {}, sessionId);
  await command("Network.enable", {}, sessionId);
  await command("Network.setBlockedURLs", { urls: ["http://*", "https://*", "ws://*", "wss://*"] }, sessionId);
  await command("Emulation.setTimezoneOverride", { timezoneId: "UTC" }, sessionId);
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
    for (const mode of ["closed", "activity", "dropdown"]) {
      const name = `${width}x${height}-${mode}`;
      const url = pathToFileURL(path.join(copy, "verification/history/capture.html")).href + `?mode=${mode}`;
      await command("Page.navigate", { url }, sessionId);
      let data;
      for (let attempt = 0; attempt < 100; attempt++) {
        const value = await command("Runtime.evaluate", {
          expression: 'document.getElementById("capture-result")?.textContent', returnByValue: true,
        }, sessionId);
        if (value.result.value) { data = JSON.parse(value.result.value); break; }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (!data?.ready || data.viewport.join() !== [width, height].join() ||
          data.activityOpen !== (mode === "activity") || data.dropdownOpen !== (mode === "dropdown")) {
        throw Error(`Invalid fixture ${name}: ${JSON.stringify(data)}`);
      }
      const image = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, sessionId);
      const bytes = Buffer.from(image.data, "base64");
      await fs.writeFile(`${output}/${name}.png`, bytes);
      results.captures.push({ ...data, screenshot: `${name}.png`, sha256: createHash("sha256").update(bytes).digest("hex") });
      console.log(name, "captured");
    }
  }
  await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2) + "\n");
} finally {
  child.kill();
  await fs.writeFile(`${output}/browser.log`, log);
}
