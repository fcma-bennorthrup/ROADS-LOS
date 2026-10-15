// Reusable isolated Summary characterization. Requires an already available
// Playwright package and the fixture server on 127.0.0.1:4179; installs nothing.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:4179";
const base = `${origin}/loans/synthetic`;
const out = "/tmp/summary-browser-evidence";
const expected = [
  ["piti","PITI","10.00%"],["dti","DTI","20.50%"],["lcv","L/CV","30.000%"],
  ["pwe-cb-score","PWE CB Score","742"],["rule-of-xx","Rule of XX","--"],
  ["total-cv","Total CV","$1,234.56"],["cash-reserves","Cash Reserves","$8,765.43"],
  ["total-loan-amount","Total Loan Amount","$333.33"],["amount-requested","Amount Requested","$222.22"],
  ["financed-fees","Financed Fees","$4.50"],["taxes-insurance","Taxes & Insurance","$5.60"],
  ["cash-to-close","Cash to Close","$11.12"],["product","Product","Fixture Product"],
  ["final-rate","Final Rate","6.700%"],["apr","APR","8.900%"],
  ["principal-interest","Principal & Interest","$7.80"],
  ["total-monthly-payment","Total Monthly Payment","$9.10"],
];
const measurements = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "en-US", timezoneId: "UTC", serviceWorkers: "block",
});
await context.route("**/*", route =>
  new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
const page = await context.newPage();
await mkdir(out, { recursive: true });

async function capture(width, height, name) {
  await page.setViewportSize({ width, height });
  await page.getByTestId("loan-content").evaluate(e => { e.scrollTop = 0; });
  const data = await page.evaluate(() => {
    const columns = [...document.querySelectorAll('[data-testid^="column-"]')];
    const grid = columns[0]?.parentElement;
    const section = document.querySelector('[data-testid="section-summary-ratios"]');
    const main = document.querySelector('[data-testid="loan-content"]');
     const row = getComputedStyle(document.querySelector('[data-testid="label-piti"]'));
    const sectionCss = getComputedStyle(section);
    return {
      viewport: [innerWidth, innerHeight],
      document: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
      main: { clientHeight: main.clientHeight, scrollHeight: main.scrollHeight, scrollTop: main.scrollTop },
      grid: { template: getComputedStyle(grid).gridTemplateColumns, gap: getComputedStyle(grid).gap },
      columnWidths: columns.map(e => e.getBoundingClientRect().width),
      typography: {
        family: row.fontFamily, size: row.fontSize, weight: row.fontWeight,
        lineHeight: row.lineHeight, color: row.color, background: row.backgroundColor,
      },
      spacing: {
        sectionPadding: sectionCss.padding, sectionMargin: sectionCss.margin,
        sectionGap: sectionCss.gap, rowPadding: row.padding, rowMargin: row.margin,
      },
      clippedRows: [...document.querySelectorAll('[data-testid^="row-"]')]
        .filter(e => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth + 1)
        .map(e => e.dataset.testid),
      fontFaces: document.fonts.size,
      resources: performance.getEntriesByType("resource").map(e => e.name),
    };
  });
  measurements.push(data);
  assert.equal(data.grid.template.split(" ").length, width < 768 ? 1 : width < 1280 ? 2 : 4);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
}

try {
  await page.goto(base);
  await page.getByTestId("loan-summary-page").waitFor();
  assert.deepEqual(await page.locator('[data-testid^="row-"]').evaluateAll(es =>
    es.map(e => e.dataset.testid)), expected.map(([id]) => `row-${id}`));
  const expectedRows = await page.evaluate(rows => rows.map(([id,label,value]) => {
    const row = document.querySelector(`[data-testid="row-${id}"]`);
    return row?.innerText.trim().split("\n").join(" | ") === `${label} | ${value}`;
  }), expected);
  assert.deepEqual(expectedRows, expected.map(() => true));
  assert.deepEqual(await page.locator('[data-testid^="card-borrower-"]').evaluateAll(es =>
    es.map(e => e.dataset.testid)), ["card-borrower-second", "card-borrower-first"]);
  assert.equal(await page.getByTestId("link-email-first").getAttribute("href"), "mailto:alpha@example.invalid");
  assert.equal(await page.getByTestId("badge-primary-borrower-first").innerText(), "Primary Borrower");
  assert.deepEqual(await page.evaluate(() => window.summaryEvidence.requests),
    [{ url: "/api/loans/synthetic", credentials: "include" }]);

  await capture(1440,900,"summary-1440x900");
  await capture(1024,768,"summary-1024x768");
  await capture(390,844,"summary-390x844");
  for (const width of [767,768,1279,1280]) await capture(width,900,`summary-${width}x900`);

  for (const [query, text] of [
    ["?state=pending","Loading loan details..."],
    ["?state=error","Failed to load loan data"],
    ["?state=empty","Failed to load loan data"],
  ]) {
    await page.goto(`${base}${query}`);
    await page.getByText(text, { exact: true }).waitFor();
  }
  await page.goto(`${base}?borrowers=zero`);
  await page.getByTestId("loan-summary-page").waitFor();
  assert.equal(await page.locator('[data-testid^="card-borrower-"]').count(), 0);

  await page.goto(base);
  const beta = page.getByTestId("button-copy-email-second");
  await beta.focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("toast-viewport").getByText("Email copied to clipboard").waitFor();
  assert.deepEqual(await page.evaluate(() => window.summaryEvidence.copies), ["beta@example.invalid"]);
  const alpha = page.getByTestId("button-copy-email-first");
  await alpha.focus();
  await page.keyboard.press("Space");
  assert.deepEqual(await page.evaluate(() => window.summaryEvidence.copies),
    ["beta@example.invalid", "alpha@example.invalid"]);

  await page.goto(`${base}?clipboard=reject`);
  await page.getByTestId("button-copy-email-second").click();
  await page.getByTestId("toast-viewport").getByText("Failed to copy email").waitFor();
  await page.goto(`${base}?clipboard=unavailable`);
  assert.equal(await page.evaluate(() => typeof navigator.clipboard), "undefined");
  await page.getByTestId("button-copy-email-second").click();
  await page.getByTestId("toast-viewport").getByText("Failed to copy email").waitFor();
  await page.goto(`${base}?clipboard=deferred`);
  await page.getByTestId("button-copy-email-second").click();
  await page.getByTestId("button-copy-email-first").click();
  await page.evaluate(() => window.summaryEvidence.pendingCopies[1].reject());
  await page.getByTestId("toast-viewport").getByText("Failed to copy email").waitFor();
  await page.evaluate(() => window.summaryEvidence.pendingCopies[0].resolve());
  await page.getByTestId("toast-viewport").getByText("Email copied to clipboard").waitFor();

  await page.goto(base);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByTestId("button-sidebar-toggle").click();
  await page.getByTestId("loan-activity-panel").waitFor();
  await page.getByTestId("button-close-activity-panel").click();
  await page.getByTestId("button-sidebar-toggle").click();
  await page.getByTestId("loan-activity-panel").waitFor();
  await page.getByTestId("button-close-activity-panel").click();
  await page.getByTestId("toolbar-checklist").click();
  await page.getByTestId("button-close-checklist").click();
  await page.getByTestId("button-more-options").click();
  await page.mouse.click(800, 500);
  assert.equal(await page.locator('[data-testid="menu-item-prototype-admin"]').evaluate(e =>
    getComputedStyle(e).visibility), "hidden");

  for (const width of [767,768,1279,1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByTestId("button-sidebar-toggle").click();
    assert.equal(await page.getByTestId("loan-activity-panel").count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.testid), "button-sidebar-toggle");
    await page.getByTestId("button-close-activity-panel").click();
    await page.getByTestId("toolbar-checklist").click();
    assert.equal(await page.getByTestId("checklist-panel").count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.testid), "toolbar-checklist");
    await page.getByTestId("button-close-checklist").click();
    await page.getByTestId("button-more-options").click();
    assert.equal(await page.locator('[data-testid="menu-item-prototype-admin"]').evaluate(e =>
      getComputedStyle(e).visibility), "visible");
    await page.mouse.click(420, 500);
    assert.equal(await page.locator('[data-testid="menu-item-prototype-admin"]').evaluate(e =>
      getComputedStyle(e).visibility), "hidden");
  }

  const audit = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource").map(e => e.name);
    return {
      url: location.href, clock: new Date().toISOString(),
      csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
      fontSet: { status: document.fonts.status, size: document.fonts.size, family: getComputedStyle(document.body).fontFamily },
      requests: window.summaryEvidence.requests, resources,
      nonFixtureResources: resources.filter(url => new URL(url).origin !== location.origin),
    };
  });
  assert.deepEqual(audit.requests, [{ url: "/api/loans/synthetic", credentials: "include" }]);
  assert.deepEqual(audit.nonFixtureResources, []);
  await writeFile(`${out}/measurements.json`, JSON.stringify({ viewports: measurements, audit }, null, 2));
  console.log(`PASS; captures and measurements written to ${out}`);
} finally {
  await context.close();
  await browser.close();
}
