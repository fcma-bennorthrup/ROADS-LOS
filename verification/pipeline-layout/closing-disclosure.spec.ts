import { expect, test } from "@playwright/test";
import { newLoanApplication } from "../../shared/loan-factory";
import { applicationView } from "../../shared/loan-application";

test("simplified disclosure generation, delivery, preview and retained package", async ({ page }, info) => {
  test.setTimeout(60000);
  const id = "closing-simulation-fixture";
  const saved = newLoanApplication({ id, loanNumber: "100000001", source: "blank", borrowerCount: 1 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === `/api/loans/${id}` && request.method() === "GET") {
      return route.fulfill({ json: applicationView(saved) });
    }
    if (path === `/api/loans/${id}/application`) {
      if (request.method() === "PUT") {
        const { section, value, generation, revision } = request.postDataJSON();
        expect(generation).toBe(saved.generation);
        expect(revision).toBe(saved.revision);
        saved.sections[section] = value;
        saved.revision++;
      }
      return route.fulfill({ json: saved });
    }
    return route.abort();
  });
  await page.goto(`/loans/${id}/documents`);
  await page.getByRole("button", { name: "Closing Documents", exact: true }).click();
  const generate = page.getByRole("button", { name: "Generate Closing Disclosure", exact: true });
  const deliver = page.getByRole("button", { name: "Deliver Closing Disclosure", exact: true });
  await expect(deliver).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reset Closing Disclosure" })).toHaveCount(0);
  await generate.click();
  const first = page.getByTestId("row-closing-disclosure-1");
  await expect(first).toBeVisible({ timeout: 10000 });
  await expect(first.getByTestId("text-delivery-date-1")).toBeEmpty();
  await expect(first.getByText("Needed", { exact: true })).toHaveCount(0);
  const popupEvent = page.waitForEvent("popup");
  await first.getByRole("button", { name: "View Closing Disclosure CD 1" }).click();
  const preview = await popupEvent;
  await expect(preview.getByRole("heading", { name: "Closing Disclosure" })).toBeVisible();
  await expect(preview.getByText("SIMULATION ONLY", { exact: false })).toBeVisible();
  expect(await preview.evaluate(() => window.opener)).toBeNull();
  await expect(deliver).toBeEnabled();
  await deliver.click();
  await expect(first.getByText("Needed", { exact: true })).toBeVisible();
  await expect(first.getByTestId("text-delivery-method-1")).toHaveText("Blend");
  const deliveryDate = await first.getByTestId("text-delivery-date-1").textContent();
  expect(deliveryDate).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2} [AP]M/);
  const assumed = await first.getByTestId("text-assumed-delivery-date-1").textContent();
  const date = new Date(deliveryDate!);
  date.setDate(date.getDate() + 3);
  expect(assumed).toBe(date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }));
  await expect(deliver).toBeDisabled();
  await expect(first.getByRole("button")).toHaveCount(1);
  await generate.click();
  await expect(page.getByTestId("row-closing-disclosure-2")).toBeVisible({ timeout: 10000 });
  await expect(first.getByTestId("text-delivery-date-1")).toHaveText(deliveryDate!);
  await page.screenshot({ path: info.outputPath("closing-disclosure-desktop.png") });
  await page.getByRole("tab", { name: "Closing Package", exact: true }).click();
  await page.getByRole("button", { name: "Generate Closing Package", exact: true }).click();
  await expect(page.getByTestId("text-closing-package-status")).toContainText("Last Generated:", { timeout: 10000 });
  await page.getByRole("button", { name: "Deliver Closing Package", exact: true }).click();
  await expect(page.getByTestId("text-closing-package-delivered")).toContainText("Marked Delivered:");
  // Wait for the real serialized save queue to finish in the intercepted fixture.
  await expect.poll(() => JSON.stringify(saved.sections)).toContain("deliveredAt");
  await page.reload();
  await page.getByRole("button", { name: "Closing Documents", exact: true }).click();
  await expect(first.getByText("Needed", { exact: true })).toBeVisible();
  await expect(page.getByTestId("row-closing-disclosure-2")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(generate).toBeVisible();
  const region = page.getByRole("region", { name: /Closing Disclosure history/ });
  const bounds = await region.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("closing-disclosure-mobile.png") });
  await preview.close();
  expect(errors).toEqual([]);
});
