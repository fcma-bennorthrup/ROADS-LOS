// Adapt only the task-local capture driver, leaving the accepted shared harness intact.
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
const work = resolve(process.argv[2]);
for (const pass of ["baseline", "candidate"]) {
  await copyFile("verification/document-presentation/local-browser.tsx",
    `${work}/${pass}/verification/document-presentation/local-browser.tsx`);
}
let capture = await readFile("verification/package-progress/capture.mjs", "utf8");
capture = capture.replace('resolve("captures")', 'resolve("local-captures")')
  .replace('entryPoints: ["verification/package-progress/browser.tsx"]',
    'entryPoints: ["verification/document-presentation/local-browser.tsx"]')
  .replace('["idle", "generating", "generated", "delivered", "error", "write-error"]',
    '["idle", "generating", "generated", "delivered", "regenerating"]');
const start = capture.indexOf('        await evaluate(`document.querySelector(\'[data-testid="sidebar-item-closing-documents"]');
const end = capture.indexOf("        // Preserve production transitions;", start);
if (start < 0 || end < 0) throw Error("Shared capture boundary changed");
capture = capture.slice(0, start) + `
        await evaluate(\`document.querySelector('[data-testid="button-generate-at-app-disclosures"]').focus()\`);
        if (mode !== "idle") {
          await evaluate(\`document.querySelector('[data-testid="button-generate-at-app-disclosures"]').click();
            document.querySelector('[data-testid="button-generate-loan-estimate"]').click()\`);
          await new Promise(r => setTimeout(r, 50));
        }
        if (["generated", "delivered", "regenerating"].includes(mode)) {
          await evaluate("window.localDocumentFixture.finish()");
          await new Promise(r => setTimeout(r, 50));
          await evaluate(\`document.querySelector('[data-testid="button-secondary-at-app-disclosures"]').focus()\`);
          await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
          await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
          await evaluate(\`document.querySelector('[data-testid="button-secondary-loan-estimate"]').click()\`);
        }
        if (["delivered", "regenerating"].includes(mode)) {
          await evaluate(\`document.querySelector('[data-testid="button-secondary-at-app-disclosures-1"]').click();
            document.querySelector('[data-testid="button-secondary-loan-estimate-1"]').click()\`);
          await new Promise(r => setTimeout(r, 50));
        }
        if (mode === "regenerating") {
          await evaluate(\`document.querySelector('[data-testid="button-generate-at-app-disclosures"]').click();
            document.querySelector('[data-testid="button-generate-loan-estimate"]').click()\`);
        }
` + capture.slice(end);
await writeFile(`${work}/local-capture.mjs`, capture);
