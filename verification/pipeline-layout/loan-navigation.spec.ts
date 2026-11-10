import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 700 }, { width: 800, height: 300 }]) {
  test(`loan drawer overlays without shifting at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/**", route => route.abort());
    await page.goto("/?loanNav");
    const trigger = page.getByTestId("button-menu");
    const shell = page.getByTestId("loan-layout-fixture");
    const toolbar = page.locator(".roads-loan-bottom-toolbar");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect((await shell.boundingBox())!.x).toBe(0);
    expect((await toolbar.boundingBox())!.x).toBe(0);
    await page.getByRole("textbox", { name: "Unsaved example" }).fill("Unchanged draft");
    const before = await shell.boundingBox();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("ROADS")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Pipeline", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Reports/ })).toBeDisabled();
    expect(await shell.boundingBox()).toEqual(before);
    expect((await toolbar.boundingBox())!.x).toBe(0);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await page.screenshot({ path: info.outputPath("loan-drawer.png") });
    await dialog.getByRole("button", { name: /Close/ }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(viewport.width - 10, viewport.height / 2);
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("textbox", { name: "Unsaved example" })).toHaveValue("Unchanged draft");
  });
}
