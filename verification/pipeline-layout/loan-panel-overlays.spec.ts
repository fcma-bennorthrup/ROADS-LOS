import { expect, test, type Locator } from "@playwright/test";

for (const panels of ["checklist", "activity", "both"] as const) {
  test(`navigation remains modal with ${panels} open`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const requests: string[] = [];
    await page.route("**/api/**", route => {
      requests.push(`${route.request().method()} ${route.request().url()}`);
      return route.abort();
    });
    await page.goto("/?loanPanels");
    const checklist = page.getByTestId("checklist-panel");
    const activity = page.getByTestId("loan-activity-panel");
    const hasChecklist = panels !== "activity";
    const hasActivity = panels !== "checklist";
    if (hasActivity) {
      await page.getByTestId("button-sidebar-toggle").click();
      await page.getByTestId("input-activity-search").fill("document");
      await page.getByTestId("select-sort").selectOption("oldest");
    }
    if (hasChecklist) {
      await page.getByTestId("toolbar-checklist").click();
      // Avoid the nested "View Task" target, which intentionally stops bubbling.
      await page.getByTestId("button-expand-task-0").click({ position: { x: 20, y: 20 } });
      await expect(page.getByTestId("button-expand-task-0")).toHaveAttribute("aria-expanded", "true");
    }
    const trigger = page.getByTestId("button-menu");
    const dialog = page.getByRole("dialog", { name: "Loan navigation" });
    const shell = page.getByTestId("loan-panels-fixture");
    const geometry = await shell.boundingBox();
    const activityContent = hasActivity ? await page.getByTestId("activity-list").textContent() : null;
    const checklistContent = hasChecklist ? await checklist.textContent() : null;
    const assertPanelState = async () => {
      await expect(checklist).toHaveCount(hasChecklist ? 1 : 0);
      await expect(activity).toHaveCount(hasActivity ? 1 : 0);
      if (hasChecklist) {
        await expect(checklist).toBeVisible();
        await expect(page.getByTestId("button-expand-task-0")).toHaveAttribute("aria-expanded", "true");
        expect(await checklist.textContent()).toBe(checklistContent);
      }
      if (hasActivity) {
        await expect(activity).toBeVisible();
        await expect(page.getByTestId("input-activity-search")).toHaveValue("document");
        await expect(page.getByTestId("select-sort")).toHaveValue("oldest");
        expect(await page.getByTestId("activity-list").textContent()).toBe(activityContent);
      }
      await expect(page.getByLabel("Unsaved example")).toHaveValue("Unchanged draft");
      expect(await shell.boundingBox()).toEqual(geometry);
    };
    const center = async (target: Locator) => {
      const box = (await target.boundingBox())!;
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    for (const dismissal of ["close", "escape", "outside"] as const) {
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Close loan navigation" })).toBeFocused();
      await assertPanelState();
      // Actual hit testing checks stacking, not just declared z-index values.
      for (const target of [
        ...(hasChecklist ? [page.getByTestId("button-close-checklist")] : []),
        ...(hasActivity ? [page.getByTestId("button-close-activity-panel")] : []),
        page.getByTestId("tab-documents"),
      ]) {
        const point = await center(target);
        expect(await page.evaluate(({ x, y }) =>
          document.elementFromPoint(x, y)?.getAttribute("data-testid"), point))
          .toBe("loan-navigation-backdrop");
        expect(await target.evaluate(el => !!el.closest('[aria-hidden="true"]'))).toBe(true);
      }
      for (const key of ["Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
      // Programmatic background focus must also be redirected into the modal.
      await page.getByLabel("Unsaved example").evaluate(el => el.focus());
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      if (dismissal === "close") {
        await page.screenshot({ path: info.outputPath(`${panels}-overlay.png`) });
        await dialog.getByRole("button", { name: "Close loan navigation" }).click();
      } else if (dismissal === "escape") {
        await page.keyboard.press("Escape");
      } else {
        // Click directly over the panel close button: dismiss only the overlay,
        // never let the same pointer event close the underlying panel.
        const point = await center(page.getByTestId(hasChecklist
          ? "button-close-checklist" : "button-close-activity-panel"));
        await page.mouse.click(point.x, point.y);
      }
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await assertPanelState();
    }
    // Underlying controls are usable again after modal dismissal.
    if (hasChecklist) {
      await page.getByTestId("button-expand-task-0").click({ position: { x: 20, y: 20 } });
      await expect(page.getByTestId("button-expand-task-0")).toHaveAttribute("aria-expanded", "false");
      await page.getByTestId("button-close-checklist").click();
      await expect(checklist).toHaveCount(0);
    }
    if (hasActivity) {
      await page.getByTestId("button-clear-search").click();
      await expect(page.getByTestId("input-activity-search")).toHaveValue("");
      await page.getByTestId("button-close-activity-panel").click();
      await expect(activity).toHaveCount(0);
    }
    expect(requests, "Panel interactions must never call saved-loan APIs").toEqual([]);
  });
}
