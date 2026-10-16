// Reuse the existing isolated CDP transport/capture driver without changing it.
// No live App, API or external transport is mounted.
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
let source = await readFile(new URL("../date-cancellation/browser.mjs", import.meta.url), "utf8");
function replace(from, to) {
  assert(source.includes(from), `Driver contract changed: ${from}`);
  source = source.replace(from, to);
}
replace('"/tmp/date-cancellation-"', '"/tmp/locked-pricing-"');
// The refreshed baseline already includes the approved date-cancellation fix.
replace('name === "candidate" ? "11/28/2026" : "10/19/2026"', '"11/28/2026"');
replace('await capture("page");', `await capture("page");
      await click("button-edit-product");
      await click("select-product");
      await click("select-product-option-4374");
      await evaluate(\`(()=>{const e=document.querySelector('[data-testid="input-term-months-"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,"241");e.dispatchEvent(new Event('input',{bubbles:true}));})()\`);
      await delay(100);`);
replace('snapshots.escape = afterEscape;', `snapshots.escape = afterEscape;
      await click("button-cancel-lock");
      await click("nav-item-fees");
      await click("nav-item-product-pricing");
      assert.equal(await evaluate(\`document.querySelector('[data-testid="form-field-product"]').textContent.includes("4374")\`), name === "candidate");
      assert.equal(await evaluate(\`document.querySelector('[data-testid="form-field-term-months-"]').textContent.includes("241")\`), name === "candidate");
      await click("button-lock-rate");
      assert.equal(await value(), name === "candidate" ? "10/20/2026" : "11/28/2026");
      await capture("remounted");
      await send("Page.reload"); await delay(1000);
      await click("button-lock-rate");
      assert.equal(await value(), name === "candidate" ? "10/20/2026" : "11/28/2026");
      await click("button-cancel-lock");`);
// Existing byte-equality assertions apply only to the unaffected states.
await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
