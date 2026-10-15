import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const [browser, output] = process.argv.slice(2);
const child = spawn(browser, ["--headless", "--no-sandbox", "--disable-gpu",
  "--host-resolver-rules=MAP * ~NOTFOUND", "--disable-background-networking",
  "--disable-component-update", "--disable-sync", "--no-first-run",
  `--user-data-dir=${output}/profile`, "--remote-debugging-pipe"],
  { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
let id = 0, buffer = "";
const waiting = new Map();
child.stdio[4].on("data", chunk => {
  buffer += chunk;
  for (let end; (end = buffer.indexOf("\0")) !== -1;) {
    const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    const done = waiting.get(message.id);
    if (done) { waiting.delete(message.id); done(message); }
  }
});
function command(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const current = ++id, timer = setTimeout(() => reject(Error(method)), 15000);
    waiting.set(current, m => { clearTimeout(timer); m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result); });
    child.stdio[3].write(JSON.stringify({ id: current, method, params, sessionId }) + "\0");
  });
}
try {
  const { targetId } = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p) => command(m, p, sessionId);
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["http://*", "https://*", "ws://*", "wss://*"] });
  for (const [width, height] of [[1440,900], [1024,768], [390,844], [639,844], [640,844]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const observations = [], images = [];
    for (const name of ["baseline", "candidate"]) {
      await send("Page.navigate", { url: pathToFileURL(`${process.cwd()}/verification/sync-recovery/${name}.html`).href });
      await new Promise(r => setTimeout(r, 900));
      observations.push(await evaluate(`JSON.stringify({
        size:[innerWidth,innerHeight], text:document.body.innerText,
        elements:[...document.querySelector('[role=dialog]').querySelectorAll('*')].map(e=>{
          const s=getComputedStyle(e),r=e.getBoundingClientRect();
          return [e.tagName,e.textContent,s.fontFamily,s.fontSize,s.color,s.backgroundColor,s.padding,s.margin,
            r.x,r.y,r.width,r.height,e.scrollWidth,e.scrollHeight];
        })
      })`));
      images.push((await send("Page.captureScreenshot", { format: "png" })).data);
    }
    assert.equal(observations[1], observations[0], `DOM and computed styles ${width}`);
    assert.equal(images[1], images[0], `pixels ${width}`);
    await send("Page.navigate", { url: pathToFileURL(`${process.cwd()}/verification/sync-recovery/candidate.html`).href + "?failure" });
    await new Promise(r => setTimeout(r, 900));
    assert.equal(await evaluate("!!document.querySelector('[role=alert]')"), true,
      await evaluate("JSON.stringify({url:location.href,text:document.body.innerText})"));
    await evaluate("document.querySelector('summary').focus()");
    assert.equal(await evaluate("document.activeElement.tagName"), "SUMMARY");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await new Promise(r => setTimeout(r, 100));
    assert.equal(await evaluate("document.querySelector('details').open"), true);
    assert.match(await evaluate("document.body.innerText"), /b.txt: write — failed/);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(`${output}/failure-${width}.png`, Buffer.from(shot.data, "base64"));
  }
  console.log("PASS: exact success pixels/text/DOM/computed layout at 5 viewports; failure results expand with Enter at all 5.");
} finally { child.kill("SIGTERM"); }
