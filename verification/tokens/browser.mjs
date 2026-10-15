// Chromium CDP pipe, no live App/server, no browser or package installation.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const [browser, work, resumeAt] = process.argv.slice(2);
const selectedModes = process.argv[5]?.split(",");
const output = path.join(work,"browser");
await fs.mkdir(output,{recursive:true});
const child=spawn(browser,["--headless","--no-sandbox","--disable-gpu","--no-proxy-server",
  "--host-resolver-rules=MAP * ~NOTFOUND","--disable-background-networking",
  "--disable-component-update","--disable-sync","--no-first-run","--disable-extensions",
  `--user-data-dir=${output}/profile`,"--remote-debugging-pipe"],
  {stdio:["ignore","ignore","pipe","pipe","pipe"]});
let seq=0,buffer="",log="";
const pending=new Map(), network=[], exceptions=[];
child.stderr.on("data",b=>{log+=b});
child.stdio[4].on("data",b=>{
  buffer+=b;
  for(let end;(end=buffer.indexOf("\0"))!==-1;){
    const msg=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);
    if(msg.method==="Network.requestWillBeSent" && /^https?:/.test(msg.params.request.url)) network.push(msg.params.request.url);
    if(msg.method==="Runtime.exceptionThrown") exceptions.push(msg.params.exceptionDetails.text);
    const waiter=pending.get(msg.id);
    if(waiter){pending.delete(msg.id);clearTimeout(waiter.timer);msg.error?waiter.reject(Error(JSON.stringify(msg.error))):waiter.resolve(msg.result);}
  }
});
function cmd(method,params={},sessionId){
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error("CDP timeout "+method)),30000);
    pending.set(id,{resolve,reject,timer});
    child.stdio[3].write(JSON.stringify({id,method,params,sessionId})+"\0");
  });
}
const sha=b=>createHash("sha256").update(b).digest("hex");
let session;
async function evaluate(expression){
  const r=await cmd("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true},session);
  if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function settle(){
  await wait(90);
  await evaluate(`(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){
    try{if(a.effect.getTiming().iterations===Infinity){a.pause();a.currentTime=0}else{a.finish()}}catch{}
  }await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})()`);
}
async function key(key,code=key){
  await cmd("Input.dispatchKeyEvent",{type:"keyDown",key,code},session);
  await cmd("Input.dispatchKeyEvent",{type:"keyUp",key,code},session);
}
async function point(selector,type="click"){
  const rect=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;
    e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  assert(rect,`Missing target ${selector}`);
  await cmd("Input.dispatchMouseEvent",{type:"mouseMoved",...rect},session);
  if(type!=="hover"){
    const button=type==="context"?"right":"left";
    await cmd("Input.dispatchMouseEvent",{type:"mousePressed",button,clickCount:1,...rect},session);
    await cmd("Input.dispatchMouseEvent",{type:"mouseReleased",button,clickCount:1,...rect},session);
  }
  await settle();
}
const snapshot = `(()=>{
  const props=["display","position","fontFamily","fontSize","fontWeight","lineHeight","letterSpacing",
    "color","backgroundColor","borderColor","borderWidth","borderRadius",
    "paddingTop","paddingRight","paddingBottom","paddingLeft",
    "marginTop","marginRight","marginBottom","marginLeft","gap",
    "width","height","overflow","overflowX","overflowY","opacity","outline","boxShadow","transform"];
  const elements=Array.from(document.body.querySelectorAll("*")).filter(e=>!["SCRIPT","STYLE"].includes(e.tagName));
  return {viewport:[innerWidth,innerHeight],text:document.body.innerText,
    active:elements.indexOf(document.activeElement),scroll:[scrollX,scrollY],
    dimensions:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
    nodes:elements.map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);
      return {tag:e.tagName,attrs:Array.from(e.attributes).filter(a=>!["style"].includes(a.name)).map(a=>[a.name,a.value]),
        text:Array.from(e.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(""),
        rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000),
        styles:props.map(p=>c[p]),value:e.value,checked:e.checked,disabled:e.disabled,
        before:getComputedStyle(e,"::before").content,after:getComputedStyle(e,"::after").content}})
  }
})()`;
const results={runs:[],comparisons:0,network,exceptions,failures:[]};
if(selectedModes) results.selectedModes = selectedModes;
results.build=JSON.parse(await fs.readFile(path.join(work,"browser-build.json"),"utf8"));
let resumed=!resumeAt;
if(resumeAt){
  const previous=JSON.parse(await fs.readFile(path.join(output,"results.json"),"utf8"));
  if(previous.build)assert.deepEqual(previous.build,results.build,"Cannot resume after fixture build changes");
  await fs.writeFile(path.join(output,"previous-results.json"),JSON.stringify(previous,null,2)+"\n");
  results.runs=previous.runs.filter(r=>!r.label.startsWith(resumeAt+"-"));
  results.failures=(previous.failures||[]).filter(r=>!r.label.startsWith(resumeAt+"-"));
  results.comparisons=results.runs.length;
  results.resumedAt=resumeAt;
}
const expected=new Map();
async function capture(label,version,screenshot=true){
  await settle();
  assert.deepEqual(await evaluate("window.fixtureErrors"),[],label);
  assert.deepEqual(await evaluate("window.externalAttempts"),[],label);
  const state=await evaluate(snapshot);
  const stateHash=sha(JSON.stringify(state));
  let imageHash, imageBytes;
  if(screenshot){
    // Full scrolling content including below-fold; overlays remain viewport-positioned.
    const metrics=await cmd("Page.getLayoutMetrics",{},session);
    const r=metrics.cssContentSize;
    const image=await cmd("Page.captureScreenshot",{format:"png",captureBeyondViewport:true,
      clip:{x:0,y:0,width:r.width,height:r.height,scale:1}},session);
    const bytes=Buffer.from(image.data,"base64");imageBytes=bytes;imageHash=sha(bytes);
    if(version==="baseline")await fs.writeFile(path.join(output,label+".png"),bytes);
  }
  const actual={stateHash,imageHash};
  if(version==="baseline")expected.set(label,{...actual,state});
  else{
    const baseline=expected.get(label);
    if(baseline.stateHash!==stateHash || baseline.imageHash!==imageHash){
      if(imageBytes)await fs.writeFile(path.join(output,label+"-candidate.png"),imageBytes);
      await fs.writeFile(path.join(output,label+"-difference.json"),JSON.stringify({baseline:baseline.state,candidate:state},null,2));
      results.failures.push({label,baselineState:baseline.stateHash,candidateState:stateHash,
        baselineImage:baseline.imageHash,candidateImage:imageHash});
      console.error("FAILED equivalence:",label);
    }
    results.comparisons++;
    results.runs.push({label,...actual,viewport:state.viewport,dimensions:state.dimensions,nodes:state.nodes.length});
    expected.delete(label);
  }
}
const modes=["forms","collections","navigation","sidebar","dialog","alert-dialog","drawer","sheet","popover",
  "tooltip","hover-card","dropdown-menu","context-menu","toast","toaster",
  "documents","documents-error","documents-empty"];
const viewports=[[1440,900],[1024,768],[390,844],[599,844],[600,844],[601,844],[639,844],[640,844],
  [767,844],[768,844],[1023,768],[1279,900],[1280,900],[1535,900],[1536,900]];
try{
  results.browser=await cmd("Browser.getVersion");
  const {targetId}=await cmd("Target.createTarget",{url:"about:blank"});
  session=(await cmd("Target.attachToTarget",{targetId,flatten:true})).sessionId;
  for(const method of ["Page.enable","Runtime.enable","Network.enable"])await cmd(method,{},session);
  await cmd("Network.setBlockedURLs",{urls:["http://*","https://*","ws://*","wss://*"]},session);
  await cmd("Emulation.setTimezoneOverride",{timezoneId:"UTC"},session);
  for(const [width,height] of viewports)for(const font of ["loaded","blocked"]){
    const primary=[1440,1024,390].includes(width);
    const currentModes=primary?modes:["forms","collections","navigation","sidebar","documents"];
    if(selectedModes) assert(selectedModes.every(m=>modes.includes(m)),"Unknown selected scene");
    for(const mode of currentModes.filter(m=>!selectedModes || selectedModes.includes(m))) {
      const prefix=`${width}x${height}-${font}-${mode}`;
      if(!resumed){if(prefix===resumeAt)resumed=true;else continue;}
      for(const version of ["baseline","candidate"]){
        await cmd("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false},session);
        await cmd("Page.navigate",{url:pathToFileURL(path.join(work,`${version}-${font}.html`)).href+"?mode="+mode},session);
        for(let i=0;i<150;i++){if(await evaluate("window.fixtureReady===true"))break;await wait(30);}
        assert(await evaluate("window.fixtureReady===true"),"Fixture did not mount "+mode);
        await evaluate(`Promise.all([document.fonts.load('400 16px "Source Sans Pro"'),document.fonts.load('600 16px "Source Sans Pro"'),document.fonts.load('400 16px "Inter"')])`);
        await settle();
        assert.deepEqual(await evaluate("[innerWidth,innerHeight]"),[width,height]);
        const faces=await evaluate('Array.from(document.fonts).filter(f=>f.status==="loaded").map(f=>f.family)');
        if(font==="loaded")assert(faces.some(f=>f.includes("Source Sans Pro")) && faces.some(f=>f.includes("Inter")),"Fonts not loaded");
        else assert.equal(faces.length,0,"Blocked fonts unexpectedly loaded");
        await capture(prefix+"-default",version);
        // Check hover and keyboard focus for every visible enabled interactive
        // element in the forms/collections/navigation consumer trees.
        if(primary && ["forms","collections","navigation"].includes(mode)){
          const selectors=await evaluate(`Array.from(document.querySelectorAll("button,input,textarea,select,a,[tabindex='0']")).filter(e=>!e.disabled&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map((e,i)=>{e.dataset.probe=String(i);return '[data-probe="'+i+'"]'})`);
          for(const [i,selector] of selectors.entries()){
            await point(selector,"hover");
            await capture(prefix+"-hover-"+i,version,false);
            await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
            await capture(prefix+"-focus-"+i,version,false);
            await key("Escape");
          }
          // Native text entry plus keyboard traversal preserve actual local outcomes.
          if(mode==="forms"){
            await point('input[aria-label="Editable field"]');
            await cmd("Input.insertText",{text:" typed"},session);
            await key("Tab");
            await capture(prefix+"-typing-tab",version);
            await point('[data-testid="roads-choice"]');
            await capture(prefix+"-roads-menu",version);
            await point("h1");
            await point('[data-control="select"] button');
            await capture(prefix+"-select-open",version);
            await key("ArrowDown");await key("Enter");await key("Escape");
            await capture(prefix+"-select-keyboard",version);
          }
        }
        if(await evaluate('!!document.querySelector("[data-action=open]")')){
          await point("[data-action=open]",["tooltip","hover-card"].includes(mode)?"hover":"click");
          await capture(prefix+"-open",version);
          await key("Tab");await capture(prefix+"-tab",version,false);
          await key("Escape");await capture(prefix+"-escape",version);
        }
        if(mode==="context-menu"){
          await point("[data-action=context]","context");await capture(prefix+"-open",version);
          await key("ArrowDown");await key("Escape");await capture(prefix+"-escape",version);
        }
        if(mode.startsWith("documents")){
          await point('[data-testid="button-edit-closing-disclosure-1"]');
          assert(await evaluate('!!document.querySelector("[role=dialog]")'),"Documents sheet not open");
          if(mode==="documents-error")assert(await evaluate('!!document.querySelector("[role=alert]")'),"Expected error absent");
          if(mode==="documents-empty")assert(await evaluate('!!document.querySelector("[data-testid=empty-borrowers-1]")'),"Expected empty absent");
          await capture(prefix+"-sheet-open",version);
          await key("Tab");await capture(prefix+"-sheet-focus",version,false);
          await evaluate('document.querySelector(".closing-borrower-sheet-body").scrollTop=10000');
          await capture(prefix+"-sheet-below-fold",version);
          await key("Escape");await capture(prefix+"-sheet-dismissed",version);
          if(mode==="documents"){
            await point('[data-testid="button-view-borrower-status-1"]');
            assert(await evaluate('!!document.querySelector("[data-testid=popover-borrower-status-1]")'),"Documents popover absent");
            await capture(prefix+"-popover",version);
            await key("Escape");await capture(prefix+"-popover-dismissed",version);
          }
        }
        if(mode==="sidebar"){
          await point('[data-sidebar="trigger"]');
          await capture(prefix+"-toggled",version);await key("Escape");
        }
      }
      console.log(prefix,results.failures.some(f=>f.label.startsWith(prefix+"-"))?"FAILED (recorded)":"passed");
    }
  }
  assert.equal(network.length,0,"External URL requested");
  assert.equal(exceptions.length,0,"Uncaught browser errors");
  assert(resumed,"Requested resume scene does not exist");
  results.status=results.failures.length?"failed":"passed";
}catch(error){results.status="failed";results.error=String(error);throw error}
finally{
  await fs.writeFile(path.join(output,"results.json"),JSON.stringify(results,null,2)+"\n");
  child.kill();
  await fs.writeFile(path.join(output,"browser.log"),log);
}
if(results.failures.length)process.exitCode=1;
