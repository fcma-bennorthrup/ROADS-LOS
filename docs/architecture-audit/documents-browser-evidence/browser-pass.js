/**
 * Replay/metrics helper for the isolated documents fixture.
 * Intended to be called from the existing Playwright notebook with its `page`
 * and `context`; it does not start a server or touch the live app.
 */
const ORIGIN = "http://127.0.0.1:4173";
const INDEX = `${ORIGIN}/verification/documents/index.html`;
const VIEWPORTS = [
  [1440, 900], [1024, 768], [390, 844], [599, 900],
  [600, 900], [601, 900], [766, 900], [767, 900], [768, 900],
];

export async function prepareIsolatedFixture(context, page) {
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    const allowedStatic = url.origin === ORIGIN &&
      /\.(?:html|js|css)$/.test(url.pathname) &&
      route.request().method() === "GET";
    if (allowedStatic) await route.continue();
    else await route.abort();
  });
  await page.goto(INDEX);
  return page.evaluate(() => ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    route: location.href,
    seededStorage: Object.keys(localStorage),
    instrumentation: Boolean(window.documentsVerification),
  }));
}

export async function collectViewportMetrics(page) {
  const results = [];
  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    results.push(await page.evaluate(() => {
      const history = document.querySelector(
        '[aria-label*="history, scroll"]',
      );
      const toolbar = document.querySelector(
        '[data-testid="bottom-toolbar"]',
      );
      const box = element => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          rect: [rect.x, rect.y, rect.width, rect.height],
          client: [element.clientWidth, element.clientHeight],
          scroll: [element.scrollWidth, element.scrollHeight],
          overflow: [
            getComputedStyle(element).overflowX,
            getComputedStyle(element).overflowY,
          ],
        };
      };
      return {
        viewport: [innerWidth, innerHeight],
        history: box(history),
        toolbar: box(toolbar),
        bodyFont: getComputedStyle(document.body).fontFamily,
        pageWidth: document.documentElement.scrollWidth,
      };
    }));
  }
  return results;
}

export async function loadScenario(page, scenario = "success") {
  const query = scenario === "success" ? "" : `?scenario=${scenario}`;
  // Always reload through the original fixture URL, never the synthetic route.
  await page.goto(`${INDEX}${query}`);
  return {
    url: page.url(),
    body: await page.locator("body").innerText(),
  };
}
