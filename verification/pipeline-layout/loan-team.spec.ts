import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`loan team fits and keeps keyboard focus at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/**", route => route.fulfill({ json: [{
      id: "team-fixture", loanNumber: "100000001", primaryBorrowerName: "Synthetic Borrower",
      loanType: "Purchase", stage: "Customer Application", amountRequested: 100000,
      product: null, mode: "empty", revision: 0, loanOfficer: "Sarah Williams",
      createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-01T12:00:00Z",
    }] }));
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "View loan team for loan 100000001" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Loan Team" });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel("Sales Support Primary")).toHaveValue("Tyler Coke");
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    for (let index = 0; index < 10; index++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await page.screenshot({ path: info.outputPath(`loan-team-${width}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId("pipeline-page")).toBeVisible();
  });
}
