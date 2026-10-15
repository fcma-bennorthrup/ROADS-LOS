import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const [browser, output] = process.argv.slice(2);
const child = spawn(browser, ["--headless", "--no-sandbox", "--disable-gpu",
  "--host-resolver-rules=MAP * ~NOTFOUND", "--disable-background-networking",
  "--disable-component-update", "--disable-sync", "--no-first-run", "--disable-extensions",
  `--user-data-dir=${output}/profile`, "--remote-debugging-pipe"],
  { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
let id = 0, buffer = "";
const pending = new Map();
child.stdio[4].on("data", chunk => {
  buffer += chunk;
  for (let end; (end = buffer.indexOf("\0")) !== -1;) {
    const m = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    const p = pending.get(m.id);
    if (p) { pending.delete(m.id); clearTimeout(p.timer);
      m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  }
});
function command(method, params = {}, sessionId) {
  const current = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Timeout ${method}`)), 15000);
    pending.set(current, { resolve, reject, timer });
    child.stdio[3].write(JSON.stringify({ id: current, method, params, sessionId }) + "\0");
  });
}
const settle = () => new Promise(r => setTimeout(r, 800));
try {
  const { targetId } = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p) => command(m, p, sessionId);
  const evaluate = async expression => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const click = async testId => {
    await evaluate(`document.querySelector('[data-testid="${testId}"]').click()`); await settle();
  };
  const key = async name => {
    const code = name === "Tab" ? 9 : name === "Enter" ? 13 : 27;
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: name, code: name, windowsVirtualKeyCode: code });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: name, code: name, windowsVirtualKeyCode: code });
    await settle();
  };
  const load = async (version, mode) => {
    await send("Page.navigate", { url: pathToFileURL(`${process.cwd()}/verification/sync-snapshots/${version}.html`).href + `?mode=${mode}` });
    for (let i = 0; i < 40; i++) {
      if (await evaluate("!!window.fixture && !!document.querySelector('button')")) break;
      await settle();
    }
    await settle();
  };
  await send("Page.enable"); await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["http://*", "https://*", "ws://*", "wss://*"] });
  await send("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [639, 844], [640, 844]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const captures = {};
    for (const version of ["baseline", "candidate"]) {
      const states = [];
      const capture = async name => {
        await evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=10000})");
        const state = await evaluate(`(() => {
          const root = document.body;
          return { text: root.innerText, viewport: [innerWidth,innerHeight],
            html: [...document.querySelectorAll('[role=dialog]')].map(e=>e.outerHTML),
            focus: document.activeElement?.outerHTML,
            styles: [...root.querySelectorAll('*:not(script)')].map(e=>{
              const s=getComputedStyle(e), r=e.getBoundingClientRect();
              return [e.tagName,s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.color,s.backgroundColor,
                s.padding,s.margin,s.overflow,s.display,r.x,r.y,r.width,r.height,e.scrollTop,e.scrollHeight];
            }) };
        })()`);
        assert.deepEqual(state.viewport, [width, height]);
        const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        const bytes = Buffer.from(data, "base64");
        await fs.writeFile(`${output}/${width}-${version}-${name}.png`, bytes);
        states.push({ name, ...state, image: createHash("sha256").update(bytes).digest("hex") });
      };
      for (const mode of ["panel", "panel-error"]) {
        await load(version, mode); await capture(mode);
        if (mode === "panel-error") {
          await evaluate("document.querySelector('summary').focus()"); await key("Enter"); await capture("panel-expanded");
        }
      }
      await load(version, "conflict"); await capture("initial");
      await click("button-keep-mine"); await capture("selected");
      await click("button-conflict-file-1"); await click("button-take-theirs");
      await evaluate("document.querySelector('.max-h-80').scrollTop=10000"); await settle(); await capture("scrolled");
      await click("button-edit-manually"); await capture("manual");
      await key("Tab"); await capture("focus");
      await click("button-take-theirs");
      await click("button-apply-resolutions");
      await capture("loading");
      const requests = await evaluate("fixture.requests.filter(r=>r.url.endsWith('resolve-conflicts'))");
      assert.equal(requests.length, 1);
      if (version === "candidate") assert.equal(requests[0].body.planId, "reviewed-plan");
      await evaluate("fixture.release()"); await settle(); await capture("stale-error");
      assert.match(await evaluate("document.body.innerText"), /Run sync again/);
      await key("Escape");
      states.push({ name: "escape-outcome", closed: await evaluate("fixture.closed") });
      captures[version] = states;
    }
    await fs.writeFile(`${output}/${width}-states.json`, JSON.stringify(captures));
    assert.deepEqual(captures.candidate, captures.baseline, `${width}: unaffected DOM/styles/focus/scroll/pixels differ`);
    console.log(`PASS ${width}x${height}: ${captures.candidate.length} exact DOM/text/styles/focus/scroll/pixel comparisons; stale error and dismissal`);
  }
  await load("candidate", "conflict");
  await click("button-keep-mine");
  await evaluate("fixture.replacePlan()"); await settle();
  await click("button-conflict-file-1"); await click("button-take-theirs");
  await click("button-apply-resolutions");
  assert.equal(await evaluate("fixture.requests.at(-1).body.planId"), "reviewed-plan");
  await evaluate("fixture.response='success';fixture.release()"); await settle();
  assert.equal(await evaluate("fixture.closed"), true);
  console.log("PASS: changing displayed plan cannot relabel older selections; success clears/closes through existing callback");
  for (const operation of ["pull", "push"]) {
    await load("candidate", "flow"); await click(`probe-${operation}`);
    assert.match(await evaluate("document.body.innerText"), new RegExp(`${operation === "pull" ? "Pull" : "Push"} Failed`));
    assert.match(await evaluate("document.body.innerText"), /Another sync operation/);
    await load("candidate", "flow");
    await evaluate("fixture.response='conflicts'"); await click(`probe-${operation}`);
    await click("button-keep-mine"); await click("button-conflict-file-1"); await click("button-take-theirs");
    await click("button-apply-resolutions");
    assert.equal(await evaluate("fixture.requests.at(-1).body.planId"), "reviewed-plan");
    await evaluate("fixture.release()"); await settle();
    console.log(`PASS: ${operation} busy denial is a failure; detected-plan identity reaches resolution request`);
  }
} finally { child.kill(); }
