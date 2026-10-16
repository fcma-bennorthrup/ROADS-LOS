// Same pipe-only CDP approach as the existing History fixture; no server.
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
let counter = 0, buffer = "";
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
  const id = ++counter;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Timeout ${method}`)), 15000);
    pending.set(id, { resolve, reject, timer });
    child.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
  });
}
// Allow the real dialog and scrollbar transitions to settle; do not alter CSS.
const sleep = () => new Promise(r => setTimeout(r, 800));
const results = [];
try {
  const { targetId } = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId: sid } = await command("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p) => command(m, p, sid);
  const evaluate = async expression => {
    const v = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (v.exceptionDetails) throw Error(JSON.stringify(v.exceptionDetails));
    return v.result.value;
  };
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["http://*", "https://*", "ws://*", "wss://*"] });
  await send("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [639, 844], [640, 844]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const captures = {};
    for (const version of ["baseline", "candidate"]) {
      await send("Page.navigate", { url: pathToFileURL(`${process.cwd()}/verification/conflict-diff/${version}.html`).href });
      for (let i = 0; i < 100; i++) {
        if (await evaluate('!!document.querySelector("[data-testid=button-keep-mine]")')) break;
        await sleep();
      }
      await sleep();
      const states = [];
      const click = async id => {
        await evaluate(`document.querySelector('[data-testid="${id}"]').click()`); await sleep();
      };
      const capture = async name => {
        const state = await evaluate(`(() => {
          const dialog = document.querySelector('[role=dialog]');
          const box = dialog.querySelector('.max-h-80');
          return {
            html: dialog.outerHTML,
            rows: box ? [...box.children].map(r=>[...r.children].map(c=>c.textContent)) : [],
            scroll: box ? [box.scrollTop, box.scrollHeight, box.clientHeight] : null,
            focus: document.activeElement?.outerHTML,
            styles: [...dialog.querySelectorAll('*')].map(e=>{
              const s=getComputedStyle(e), r=e.getBoundingClientRect();
              return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.color,s.backgroundColor,
                s.padding,s.margin,s.overflow,s.display,r.x,r.y,r.width,r.height];
            })
          };
        })()`);
        const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        const bytes = Buffer.from(data, "base64");
        const file = `${width}-${height}-${version}-${name}.png`;
        await fs.writeFile(`${output}/${file}`, bytes);
        states.push({ name, ...state, image: createHash("sha256").update(bytes).digest("hex") });
      };
      for (let file = 0; file < 7; file++) {
        await click(`button-conflict-file-${file}`);
        await capture(`file-${file}`);
      }
      const before = await evaluate("window.diffComputations");
      await evaluate(`document.querySelector('.max-h-80').scrollTop=10000;
        document.querySelector('[data-testid=button-keep-mine]').focus()`);
      await click("button-keep-mine");
      await capture("scrolled-mine");
      await click("button-take-theirs");
      await capture("scrolled-theirs");
      await click("button-edit-manually");
      await capture("manual");
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await capture("keyboard-focus");
      const after = await evaluate("window.diffComputations");
      captures[version] = { states, selectionComputations: after - before };
    }
    await fs.writeFile(`${output}/${width}-states.json`, JSON.stringify(captures));
    for (let i = 0; i < captures.candidate.states.length; i++) {
      for (const key of Object.keys(captures.candidate.states[i])) {
        assert.ok(JSON.stringify(captures.candidate.states[i][key]) ===
          JSON.stringify(captures.baseline.states[i][key]),
          `${width} ${captures.candidate.states[i].name}: ${key} differs; see saved states`);
      }
    }
    const rows = captures.candidate.states.slice(0, 7).map(s => s.rows);
    assert.deepEqual(rows[0], [["1", "", "1", ""]]);
    assert.deepEqual(rows[1], rows[0]);
    assert.deepEqual(rows[2], [["1", "", "1", "remote"], ["2", "", "2", ""]]);
    assert.deepEqual(rows[3], [["1", "local", "1", ""], ["2", "", "2", ""]]);
    assert.deepEqual(rows[4], [["1", "same", "1", "same"], ["2", "left", "2", "right"], ["3", "", "3", ""]]);
    assert.deepEqual(rows[5], [["1", "a", "1", "a"], ["2", "", "2", "b"], ["3", "", "3", "c"]]);
    assert.equal(rows[6].length, 403);
    assert.equal(captures.candidate.selectionComputations, 0);
    assert.equal(captures.baseline.selectionComputations, 3);
    assert.ok(captures.candidate.states.find(s=>s.name==="scrolled-mine").scroll[0] > 0);
    results.push({ width, height, exactComparisons: captures.candidate.states.length,
      baselineComputations: captures.baseline.selectionComputations,
      candidateComputations: captures.candidate.selectionComputations,
      screenshots: captures.candidate.states.map(s=>({ name:s.name, sha256:s.image })) });
    console.log(width, height, "exact DOM/styles/scroll/focus/pixels PASS; computations 3 -> 0");
  }
  await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally {
  child.kill();
}
