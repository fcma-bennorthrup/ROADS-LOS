import { expect, test, type Page } from "@playwright/test";
import { newLoanApplication } from "../../shared/loan-factory";
import { applicationView } from "../../shared/loan-application";

const id = "workspace-navigation-fixture";
const now = "2026-11-01T12:00:00Z";
const application = newLoanApplication({
  id, loanNumber: "100000001", source: "blank", borrowerCount: 1,
  now,
});
const pipelineLoan = {
  ...application.loan, mode: application.mode, revision: 0,
  primaryBorrowerName: "Synthetic Borrower", departmentQueue: "Sales Support",
  amountRequested: null, createdAt: now, updatedAt: now,
};
const tabs = ["summary", "origination", "decisioning", "closing-booking", "documents", "history"];

async function assertClosedLayout(page: Page, tab: string) {
  const shell = page.getByTestId(`loan-${tab}-page`);
  await expect(shell).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("button-menu")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".pipeline-shell")).toHaveCount(0);
  for (const element of [shell, page.getByTestId("loan-header"), page.locator(".roads-loan-bottom-toolbar")]) {
    await expect.poll(async () => (await element.boundingBox())?.x,
      { message: `${tab}: ${element} must not retain a sidebar offset` }).toBe(0);
  }
  expect((await shell.boundingBox())!.width).toBe(page.viewportSize()!.width);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 700 }]) {
  test(`full workspace tabs and return visits stay closed at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const unexpected: string[] = [];
    const errors: string[] = [];
    const saved = structuredClone(application);
    page.on("pageerror", error => errors.push(error.message));
    // No request can reach a database or external sync service, including writes.
    await page.route("**/api/**", async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === "GET") {
        if (path === "/api/loans") return route.fulfill({ json: [pipelineLoan] });
        if (path === `/api/loans/${id}`) return route.fulfill({ json: applicationView(saved) });
        if (path === `/api/loans/${id}/application`) return route.fulfill({ json: saved });
      }
      // Real page mount effects persist workflow defaults. Keep those writes
      // in this test's in-memory document, never a running application server.
      if (path === `/api/loans/${id}/application` && request.method() === "PUT") {
        const { section, value, generation, revision } = request.postDataJSON();
        expect(generation).toBe(saved.generation);
        expect(revision).toBe(saved.revision);
        saved.sections[section] = value;
        saved.revision++;
        return route.fulfill({ json: saved });
      }
      unexpected.push(`${request.method()} ${path}`);
      await route.abort();
    });
    await page.goto("/");
    await expect(page.getByTestId(`open-loan-${id}`)).toBeVisible();
    await page.getByRole("navigation", { name: "Main navigation" }).hover();
    await page.getByRole("button", { name: "Expand navigation" }).click();
    await expect(page.getByRole("button", { name: "Collapse navigation" })).toBeVisible();
    await page.getByTestId(`open-loan-${id}`).click();
    await assertClosedLayout(page, "summary");

    // Actual page components mount on each tab, not representative shell content.
    for (const tab of [...tabs.slice(1), "summary"]) {
      await page.getByTestId("button-menu").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await page.getByTestId(`tab-${tab}`).click();
      await assertClosedLayout(page, tab);
    }
    await page.screenshot({ path: info.outputPath("workspace-summary.png") });

    // Both exit controls destroy LoanScope/LoanWorkspace. Return through the real
    // Pipeline link, including after leaving with the navigation drawer open.
    for (const exit of ["drawer", "breadcrumb"] as const) {
      await page.getByTestId("tab-documents").click();
      await assertClosedLayout(page, "documents");
      if (exit === "drawer") {
        await page.getByTestId("button-menu").click();
        await page.getByRole("dialog").getByRole("button", { name: "Pipeline", exact: true }).click();
      } else {
        await page.getByTestId("breadcrumb-pipeline").click();
      }
      await expect(page.getByTestId("pipeline-page")).toBeVisible();
      await expect(page.locator(".roads-loan-shell")).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByTestId(`open-loan-${id}`).click();
      await assertClosedLayout(page, "summary");
    }

    // A fresh document load also starts closed, even if the old document's
    // drawer was open. The fixture accepts the production deep-link shape.
    await page.getByTestId("button-menu").click();
    await page.goto(`/loans/${id}/history`);
    await assertClosedLayout(page, "history");
    await page.reload();
    await assertClosedLayout(page, "history");
    expect(unexpected).toEqual([]);
    expect(errors).toEqual([]);
  });
}
