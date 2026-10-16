/**
 * Capture the isolated Origination fixture at the three requested viewports.
 * Run only while the isolated server is serving 127.0.0.1:4317.
 * Screenshots are written under /tmp, never into the repository.
 *
 * This is a capture helper, not an application test or a substitute for the
 * observed browser journey documented in browser-report.md.
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = "http://127.0.0.1:4317";
const route = "/loans/synthetic-a/origination";
const outDir = "/tmp/origination-evidence";
const sections = [
  ["borrower-information", "nav-item-borrower-information"],
  ["loan-details", "nav-item-loan-details"],
  ["collateral", "nav-item-collateral"],
  ["product-pricing", "nav-item-product-pricing"],
  ["fees", "nav-item-fees"],
];
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
const blockedRequests = [];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ timezoneId: "UTC" });
await context.route("**/*", async (requestRoute) => {
  const url = new URL(requestRoute.request().url());
  const fixtureOrigin =
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    url.port === "4317";
  if (fixtureOrigin) return requestRoute.continue();
  blockedRequests.push({
    url: url.href,
    resourceType: requestRoute.request().resourceType(),
  });
  return requestRoute.abort();
});

try {
  const page = await context.newPage();
  await page.goto(`${baseURL}${route}`);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const [section, testId] of sections) {
      await page.getByTestId(testId).click();
      const filename = `${viewport.width}x${viewport.height}-${section}.png`;
      await page.screenshot({
        path: path.join(outDir, filename),
        fullPage: false,
      });
      console.log(`captured ${filename}`);
    }
  }
  console.log("blockedRequests", JSON.stringify(blockedRequests, null, 2));
} finally {
  await context.close();
  await browser.close();
}
