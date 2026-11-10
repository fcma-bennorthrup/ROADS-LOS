import { expect, test, type Locator } from "@playwright/test";
import type { PipelineLoan } from "../../shared/pipeline";

const fixture: PipelineLoan = {
  id: "layout-fixture", loanNumber: "100000001", primaryBorrowerName: "Synthetic Borrower",
  loanType: "Purchase", stage: "Customer Application", amountRequested: 234567,
  product: "Fixed", mode: "empty", revision: 0, cifNumber: "654321", region: "502",
  loanOfficer: "Synthetic Officer", applicationDate: "2026-11-01",
  contractExpiryDate: "2026-12-01", decision: "", departmentQueue: "Sales Support",
  createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-01T12:00:00Z",
};
const common = ["Loan Number", "CIF", "Region", "Borrower Name", "Loan Purpose"];
const queues = [
  { id: "all-loans", headers: [...common, "Req Amount", "Stage", "LO", "App Start Date", "Decision", "Actions"] },
  { id: "sales-support", headers: [...common, "Req Amount", "Stage", "LO", "App Submit Date", "Contract Exp Date", "Decision", "Appraisal", "Actions"] },
  { id: "operations", headers: [...common, "Stage", "LO", "Closing Date", "Contract Exp Date", "TRID", "Decision", "Appraisal", "Title Work", "Actions"] },
];

for (const viewport of [{ width: 1440, height: 1200 }, { width: 800, height: 700 }, { width: 390, height: 900 }]) {
  test(`navigation pushes content at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/**", route => route.fulfill({ json: [fixture] }));
    await page.goto("/");
    await expect(page.getByTestId("pipeline-row-layout-fixture")).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const shell = page.locator(".pipeline-shell");
    const compact = (await shell.boundingBox())!.x;
    const togglePosition = page.getByTestId("button-toggle-navigation");
    const assertCentered = async () => {
      const box = (await togglePosition.boundingBox())!;
      expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(1);
    };
    await assertCentered();
    await nav.hover();
    await expect(page.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Expand navigation" }).click();
    await expect(page.getByRole("button", { name: "Collapse navigation" })).toHaveAttribute("aria-expanded", "true");
    await expect.poll(async () => (await shell.boundingBox())!.x).toBeGreaterThan(compact);
    const navBox = (await nav.boundingBox())!;
    const shellBox = (await shell.boundingBox())!;
    expect(shellBox.x).toBeGreaterThanOrEqual(navBox.x + navBox.width - 1);
    expect(shellBox.x + shellBox.width).toBeLessThanOrEqual(viewport.width + 1);
    await expect(nav.getByText("ROADS")).toBeVisible();
    await assertCentered();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await assertCentered();
    await page.screenshot({ path: info.outputPath("expanded.png"), fullPage: true });
    const toggle = page.getByRole("button", { name: "Collapse navigation" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await shell.boundingBox())!.x).toBe(compact);
    await expect(page.getByTestId("pipeline-row-layout-fixture")).toHaveCount(1);
  });
}
test("short viewport keeps the toggle below icons and reachable", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 300 });
  await page.route("**/api/**", route => route.fulfill({ json: [fixture] }));
  await page.goto("/");
  const toggle = page.getByTestId("button-toggle-navigation");
  for (const expanded of [false, true]) {
    await toggle.focus();
    await expect(toggle).toBeInViewport();
    const buttonBox = (await toggle.boundingBox())!;
    const reportsBox = (await page.getByTestId("main-nav-reports").boundingBox())!;
    expect(buttonBox.y).toBeGreaterThanOrEqual(reportsBox.y + reportsBox.height);
    await expect(toggle).toHaveAttribute("aria-expanded", String(expanded));
    await page.keyboard.press("Enter");
  }
});
for (const count of [0, 1, 20]) {
  test(`footer follows content with ${count} records`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1920, height: 1400 });
    await page.route("**/api/**", route => route.fulfill({ json: Array.from({ length: count }, (_, i) => ({
      ...fixture, id: `footer-${i}`, loanNumber: String(100000001 + i),
    })) }));
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText(`${count} ${count === 1 ? "loan" : "loans"}`);
    const footer = (await page.locator(".pipeline-footer").boundingBox())!;
    const content = (await page.locator(".pipeline-content").boundingBox())!;
    expect(footer.y).toBeGreaterThanOrEqual(content.y + content.height - 1);
    expect(footer.y + footer.height).toBeGreaterThanOrEqual(1399);
    if (count < 2) expect(footer.y + footer.height).toBeLessThanOrEqual(1401);
    await expect(page.locator("tr[data-loan]")).toHaveCount(count);
    await page.screenshot({ path: info.outputPath("footer.png"), fullPage: true });
  });
}

async function readableHeaders(headers: Locator) {
  const problems = await headers.evaluateAll(cells => cells.flatMap(cell => {
    const bounds = cell.getBoundingClientRect();
    const css = getComputedStyle(cell);
    const contentLeft = bounds.left + parseFloat(css.paddingLeft);
    const contentRight = bounds.right - parseFloat(css.paddingRight);
    const range = document.createRange();
    range.selectNodeContents(cell);
    const rects = Array.from(range.getClientRects());
    return rects.some(rect => rect.width > 0 && (rect.left < contentLeft - 1 || rect.right > contentRight + 1))
      || cell.scrollWidth > cell.clientWidth + 1 || parseFloat(css.fontSize) < 12
      ? [cell.textContent] : [];
  }));
  expect(problems, "Header text and sort arrows must fit inside their own padded cells").toEqual([]);
}

for (const width of [1440, 390]) {
  for (const queue of queues) {
    test(`${queue.id} at ${width}px: headers, scrolling and preserved controls`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      const unexpectedRequests: string[] = [];
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      // No application server or saved loans: every API request is intercepted.
      await page.route("**/api/**", async route => {
        const request = route.request();
        if (new URL(request.url()).pathname === "/api/loans" && request.method() === "GET") {
          await route.fulfill({ json: [fixture] });
        } else {
          unexpectedRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
          await route.abort();
        }
      });
      await page.goto("/");
      await expect(page.getByTestId("pipeline-row-layout-fixture")).toBeVisible();
      await page.getByTestId(`queue-${queue.id}`).click();
      const headers = page.getByRole("columnheader");
      await expect(headers).toHaveText(queue.headers);
      await readableHeaders(headers);
      // Active sort arrows also need space; initial unsorted labels alone are insufficient.
      for (const sort of await headers.locator("button").all()) {
        await sort.click();
        await readableHeaders(headers);
      }
      if (queue.id === "operations") {
        await expect(page.locator("tbody tr")).toHaveCount(0);
        await expect(page.getByTestId("pipeline-empty")).toContainText("No loans assigned to Operations");
        await expect(headers.nth(5)).toHaveText("Stage");
        await expect(headers.nth(5)).toHaveCSS("text-align", "left");
      } else {
        const cells = page.getByTestId("pipeline-row-layout-fixture").locator("td");
        await expect(cells).toHaveCount(queue.headers.length);
        await expect(cells.nth(6)).toHaveText("Customer Application");
        await expect(cells.nth(5)).toHaveCSS("text-align", "right");
        for (let i = 0; i < queue.headers.length; i++) {
          const header = (await headers.nth(i).boundingBox())!;
          const cell = (await cells.nth(i).boundingBox())!;
          expect(Math.abs(header.x - cell.x)).toBeLessThan(1);
          expect(Math.abs(header.width - cell.width)).toBeLessThan(1);
        }
      }
      const wrapper = page.locator(".pipeline-table-wrap");
      await wrapper.scrollIntoViewIfNeeded();
      await expect(wrapper).toHaveCSS("overflow-x", "auto");
      const scroll = await wrapper.evaluate(element => {
        element.scrollLeft = element.scrollWidth;
        return { left: element.scrollLeft, width: element.clientWidth, total: element.scrollWidth,
          right: element.getBoundingClientRect().right };
      });
      expect(scroll.total).toBeGreaterThan(scroll.width);
      expect(scroll.left).toBeGreaterThan(0);
      expect(scroll.right).toBeLessThanOrEqual(width + 1);
      await expect(headers.last()).toBeInViewport({ ratio: 1 });
      if (queue.id !== "operations") {
        await expect(page.getByRole("link", { name: "View loan 100000001", exact: true })).toBeInViewport({ ratio: 1 });
        await expect(page.getByRole("button", { name: "Assign loan 100000001 — unavailable" })).toBeDisabled();
      }
      await page.screenshot({ path: info.outputPath("actions.png") });
      await wrapper.evaluate(element => { element.scrollLeft = 0; });
      await page.screenshot({ path: info.outputPath("headers.png") });
      await expect(page.getByRole("searchbox", { name: "Filter table results" })).toBeVisible();
      await expect(page.getByTestId("input-pipeline-search")).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Items per page" })).toHaveValue("20");
      await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
      await page.getByRole("button", { name: "Custom Filter", exact: true }).click();
      await expect(page.getByRole("group", { name: "Filter by stage" })).toBeVisible();
      await page.getByTestId("button-new-loan").click();
      await expect(page.getByTestId("source-sf")).toBeChecked();
      await expect(page.getByTestId("source-blend")).toBeVisible();
      await page.getByTestId("cancel-new-loan").click();
      await page.getByTestId("button-more-options").click();
      await expect(page.getByTestId("menu-item-prototype-admin")).toBeVisible();
      expect(unexpectedRequests).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
