import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

assert(process.cwd().startsWith("/tmp/design-showcase-"));
const out = resolve("../captures");
await mkdir(out, { recursive: true });
const app = await readFile("client/src/App.tsx", "utf8");
assert(!/design-system|DesignSystemPage/.test(app));
assert.deepEqual([...app.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]),
  ["/", "/loans/:id/origination", "/loans/:id/decisioning", "/loans/:id/closing-booking",
    "/loans/:id/documents", "/loans/:id/history", "/loans/:id"]);
const built = await build({ entryPoints: ["verification/design-showcase/browser.tsx"], bundle: true,
  outfile: `${out}/fixture.js`, jsx: "automatic", metafile: true,
  define: { "process.env.NODE_ENV": '"production"' }, alias: { "@": resolve("client/src") } });
assert(!Object.keys(built.metafile.inputs).some(p => /App.tsx|server\/|contexts\/|hooks\//.test(p)));
await writeFile(`${out}/bundle-inputs.json`, JSON.stringify(Object.keys(built.metafile.inputs), null, 2));
execFileSync("node", ["node_modules/tailwindcss/lib/cli.js", "-i", "client/src/index.css", "-o", `${out}/style.css`]);
let fontCSS = "";
try {
  fontCSS = await readFile(resolve("../fonts/fonts.css"), "utf8");
  for (const match of [...fontCSS.matchAll(/url\(\/fonts\/([^)]+)\)/g)]) {
    const data = await readFile(resolve("../fonts", match[1]));
    fontCSS = fontCSS.replace(match[0], `url(data:font/woff2;base64,${data.toString("base64")})`);
  }
} catch { /* Recorded explicitly below; blocked-font checks still run. */ }
for (const fonts of ["blocked", "loaded"]) {
  await writeFile(`${out}/${fonts}.html`, `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src ${fonts === "loaded" ? "data:" : "'none'"}; connect-src 'none'">
<style>${await readFile(`${out}/style.css`, "utf8")}</style>
<style>${fonts === "loaded" ? fontCSS : ""}</style></head><body><div id="root"></div>
<script>${(await readFile(`${out}/fixture.js`, "utf8")).replaceAll("</script", "<\\/script")}</script></body></html>`);
}
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu",
  "--disable-background-networking", "--disable-component-update", "--disable-sync",
  "--disable-extensions", "--no-first-run", "--hide-scrollbars",
  "--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=<-loopback>",
  "--host-resolver-rules=MAP * ~NOTFOUND", `--user-data-dir=${out}/profile`,
  "--remote-debugging-pipe", "about:blank"], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
let id = 0, buffer = "";
const pending = new Map();
browser.stdio[4].on("data", chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf("\0")) >= 0) {
    const msg = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
    const entry = pending.get(msg.id);
    if (entry) {
      clearTimeout(entry.timer); pending.delete(msg.id);
      if (msg.error) entry.reject(Error(JSON.stringify(msg.error))); else entry.resolve(msg.result);
    }
  }
});
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => reject(Error(`CDP timeout ${method}`)), 20000);
    pending.set(n, { resolve, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id: n, method, params, sessionId }) + "\0");
  });
}
const wait = () => new Promise(r => setTimeout(r, 250));
const evidence = [];
const swatches = ["text-primary","text-secondary","text-brand","text-link","text-reverse","text-error","text-warning","text-information",
  "background-page","background-primary","background-dark","background-brand","background-brand-subtle","background-error","background-error-subtle","background-warning-subtle","background-information-subtle",
  "icon-dark","icon-brand","border-subtle","border-brand","border-reverse"];
const typography = ["headline-100","headline-200","headline-300","body-100","body-200","body-200-strong","caption-100","caption-100-strong","label-strong"];
const spacing = ["component-3xs","component-2xs","component-xs","component-m","component-l","component-s","component-xl","component-2xl","component-3xl","layout-xs"];
const buttons = ["default","secondary","outline","ghost","destructive","small","medium","large"].map(x => `button-${x}`);
try {
  for (const fonts of fontCSS ? ["blocked", "loaded"] : ["blocked"]) {
    for (const dark of [false, true]) for (const [width, height] of [[375,844],[390,844],[639,900],[640,900],[1023,768],[1024,768],[1440,900]]) {
      const { targetId } = await send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      const call = (m, p) => send(m, p, sessionId);
      const evaluate = async expression => {
        const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result.value;
      };
      const key = async (key, code, vk) => {
        await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk });
        await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
      };
      await call("Page.enable");
      await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
      await call("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
      await call("Page.navigate", { url: `file://${out}/${fonts}.html` });
      await wait();
      await evaluate(`document.documentElement.classList.toggle("dark", ${dark}); document.fonts.ready.then(() => true)`);
      await wait(); // Let the existing badge color transitions settle after dark ancestry changes.
      const snapshot = () => evaluate(`(() => {
        const root = document.getElementById("root");
        const nodes = [...root.querySelectorAll("[data-testid]")];
        return { viewport: [innerWidth, innerHeight], text: root.textContent,
          ids: nodes.map(e => e.dataset.testid), html: root.innerHTML,
          fonts: [...document.fonts].map(f => ({family:f.family,status:f.status})),
          geometry: nodes.map(e => { const s=getComputedStyle(e), r=e.getBoundingClientRect();
            return { id:e.dataset.testid, x:r.x,y:r.y+scrollY,width:r.width,height:r.height,
              font:s.font,color:s.color,background:s.backgroundColor,border:s.border,radius:s.borderRadius,
              children:[...e.children].map(c=>{const s=getComputedStyle(c),r=c.getBoundingClientRect();return {
                font:s.font, background:s.backgroundColor,border:s.border,radius:s.borderRadius,width:r.width,height:r.height,
                display:s.display,columns:s.gridTemplateColumns,flexDirection:s.flexDirection}}) }; }),
          page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight] };
      })()`);
      const initial = await snapshot();
      // Reviewed current copy/order, not a desired-future snapshot or auto-update mode.
      assert.equal(createHash("sha256").update(initial.text).digest("hex"),
        "ab160e627411a46c892f90d27844ffeabf3c041333c41a999b52411702de809c");
      assert.equal(createHash("sha256").update(JSON.stringify(initial.ids)).digest("hex"),
        "8c28b174bb1624cb98751387d7d5cf6a9478b9497c46944605ba919ae45c7a02");
      assert.deepEqual(initial.viewport, [width,height]);
      for (const [prefix, names] of [["color-swatch-",swatches],["typography-",typography],["spacing-",spacing],["radius-",["2xs","xs","round"]]]) {
        assert.deepEqual(initial.ids.filter(x => x.startsWith(prefix)), names.map(x => prefix+x));
      }
      assert.deepEqual(initial.ids.filter(x => x.startsWith("button-")),buttons);
      assert.deepEqual(initial.ids.filter(x => x.startsWith("input-")),["input-example","input-disabled"]);
      assert.deepEqual(initial.ids.filter(x => x.startsWith("badge-")),["badge-default","badge-secondary","badge-outline","badge-destructive"]);
      assert.deepEqual(initial.ids.filter(x => x.startsWith("swatch-")),["swatch-primary","swatch-secondary","swatch-muted","swatch-destructive","swatch-warning","swatch-info"]);
      assert.deepEqual(await evaluate(`[...document.querySelectorAll(".text-lg")].map(e=>e.textContent)`),["Loan Application","Document Review"]);
      assert.deepEqual(await evaluate(`[...document.querySelectorAll("section h2")].map(e=>e.textContent)`),
        ["Color Palette","Typography Scale","Spacing Scale","Border Radius","Components","Semantic Color Mapping"]);
      assert.equal(await evaluate(`document.querySelector('[data-testid="color-swatch-text-primary"]').parentElement.children.length`),8);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-testid="color-swatch-text-primary"]').parentElement).gridTemplateColumns.split(" ").length`), width<640?1:width<1024?2:3);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-testid="typography-headline-100"]')).flexDirection`),width<640?"column":"row");
      if (fonts === "loaded") assert(initial.fonts.some(f=>f.family.includes("Source Sans Pro") && f.status==="loaded"));
      // Native input, label, typing, paste insertion, clear and disabled behavior.
      const click = async selector => {
        const pos = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:"center"}); const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        await call("Input.dispatchMouseEvent",{type:"mousePressed",...pos,button:"left",clickCount:1});
        await call("Input.dispatchMouseEvent",{type:"mouseReleased",...pos,button:"left",clickCount:1});
      };
      await click('[data-testid="label-example"]');
      assert.equal(await evaluate(`document.activeElement.id`),"example-input");
      for (const char of "Typed") await call("Input.dispatchKeyEvent",{type:"char",text:char});
      await evaluate(`navigator.clipboard.writeText(" pasted text")`);
      await call("Input.dispatchKeyEvent",{type:"keyDown",key:"v",code:"KeyV",windowsVirtualKeyCode:86,modifiers:2});
      await call("Input.dispatchKeyEvent",{type:"keyUp",key:"v",code:"KeyV",windowsVirtualKeyCode:86,modifiers:2});
      await wait();
      assert.equal(await evaluate(`document.getElementById("example-input").value`),"Typed pasted text");
      await evaluate(`document.getElementById("example-input").select()`);
      await key("Backspace","Backspace",8);
      assert.equal(await evaluate(`document.getElementById("example-input").value`),"");
      await click('[data-testid="input-disabled"]');
      assert.equal(await evaluate(`document.getElementById("disabled-input").disabled && document.getElementById("disabled-input").value === ""`),true);
      await evaluate(`document.querySelector('[data-testid="button-default"]').focus()`);
      const tabOrder = ["button-default"];
      for(let i=0;i<8;i++) {
        await key("Tab","Tab",9);
        tabOrder.push(await evaluate(`document.activeElement.dataset.testid`));
      }
      assert.deepEqual(tabOrder,[...buttons,"input-example"]);
      await key("Tab","Tab",9);
      assert.notEqual(await evaluate(`document.activeElement.id`),"disabled-input");
      const url = await evaluate("location.href");
      for (const b of buttons) {
        await click(`[data-testid="${b}"]`);
        await key("Enter","Enter",13); await key(" ","Space",32);
      }
      assert.equal(await evaluate("location.href"),url);
      assert.equal(await evaluate(`document.getElementById("root").innerHTML`),initial.html);
      assert.equal(await evaluate(`document.querySelectorAll("form").length`),0);
      await evaluate(`document.getElementById("example-input").value="not persisted"; window.remount()`);
      assert.equal(await evaluate(`document.getElementById("example-input").value`),"");
      // Two same-source passes: screenshots and all authored test-ID geometry.
      const name = `${fonts}-${dark?"dark":"light"}-${width}`;
      const shots = [];
      for (const section of ["colors","typography","spacing","radius","components","semantic-mapping"]) {
        const bounds = await evaluate(`(() => {const r=document.querySelector('[data-testid="section-${section}"]').getBoundingClientRect();return {top:r.top+scrollY,height:r.height}})()`);
        for (let offset=0;offset<bounds.height;offset+=height-80) {
          await evaluate(`scrollTo(0,${bounds.top+offset})`);
          await wait();
          const pair = [];
          for (let pass=0;pass<2;pass++) {
            const shot = await call("Page.captureScreenshot",{format:"png"});
            const bytes = Buffer.from(shot.data,"base64");
            await writeFile(`${out}/${name}-${section}-${offset}-${pass}.png`,bytes);
            pair.push(createHash("sha256").update(bytes).digest("hex"));
          }
          assert.equal(pair[0],pair[1]);
          shots.push({section,offset,hash:pair[0]});
        }
      }
      for (const state of ["focus","hover","active"]) {
        const pos = await evaluate(`(() => {const e=document.querySelector('[data-testid="${state==="focus"?"input-example":"button-default"}"]');e.scrollIntoView({block:"center"});${state==="focus"?"e.focus();":""}const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
        if(state!=="focus") await call("Input.dispatchMouseEvent",{type:"mouseMoved",...pos});
        if(state==="active") await call("Input.dispatchMouseEvent",{type:"mousePressed",...pos,button:"left",clickCount:1});
        await wait();
        const shot=await call("Page.captureScreenshot",{format:"png"});
        await writeFile(`${out}/${name}-${state}.png`,Buffer.from(shot.data,"base64"));
        if(state==="active") await call("Input.dispatchMouseEvent",{type:"mouseReleased",...pos,button:"left",clickCount:1});
      }
      await evaluate("document.activeElement.blur()");
      await evaluate("scrollTo(0,0)");
      await wait();
      const after = await snapshot();
      assert.deepEqual(after.geometry,initial.geometry);
      evidence.push({name,...initial,html:undefined,tabOrder,shots});
      console.log(name,"PASS");
      await send("Target.closeTarget",{targetId});
    }
  }
} finally {
  await writeFile(`${out}/evidence.json`,JSON.stringify({fontLoadedAvailable:!!fontCSS,evidence},null,2));
  browser.kill();
}
assert(fontCSS,"Loaded-font proof blocked: declared fonts unavailable");
