import { expect, test } from "@playwright/test";
import { newLoanApplication } from "../../shared/loan-factory";
import { applyTridDemoAction } from "../../shared/business-rules/trid-demo-actions";
import { pipelineView } from "../../shared/pipeline";

test("claims and edits Operations with shared team visibility", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  let document = applyTridDemoAction(newLoanApplication({
    id: "claim-fixture", loanNumber: "100000001", source: "blank", borrowerCount: 1,
  }), "trid-manual");
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/loans") return route.fulfill({ json: [pipelineView(document)] });
    if (path === "/api/loans/claim-fixture/application") {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON();
        expect(body.revision).toBe(document.revision);
        expect(body.section).toBe("operations-team");
        document = { ...document, revision: document.revision + 1,
          sections: { ...document.sections, [body.section]: body.value } };
      }
      return route.fulfill({ json: document });
    }
    return route.abort();
  });
  await page.goto("/");
  await page.getByTestId("queue-operations").click();
  const trigger = page.getByRole("button", { name: /Edit Operations team/ });
  await expect(trigger).toHaveCSS("color", "rgb(0, 91, 148)");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Loan Team Assignment" });
  await expect(dialog.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  await dialog.getByLabel("Operations Primary").selectOption("Megann Ziedes");
  await expect(dialog.getByLabel("Operations Secondary").locator('option[value="Megann Ziedes"]')).toBeDisabled();
  await dialog.getByLabel("Operations Secondary").selectOption("Taylor Beckham");
  await page.screenshot({ path: testInfo.outputPath("operations-claim.png") });
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toHaveCSS("color", "rgb(39, 51, 51)");
  await page.getByTestId("queue-all-loans").click();
  await page.getByRole("button", { name: /View loan team/ }).click();
  await expect(page.getByLabel("Operations Primary")).toHaveValue("Megann Ziedes");
  await expect(page.getByLabel("Operations Secondary")).toHaveValue("Taylor Beckham");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByTestId("queue-operations").click();
  await trigger.click();
  await expect(dialog.getByLabel("Operations Primary")).toHaveValue("Megann Ziedes");
  await dialog.getByLabel("Operations Primary").selectOption("Hajar Bonnett");
  await dialog.getByLabel("Operations Secondary").selectOption("");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await expect(dialog.getByLabel("Operations Primary")).toHaveValue("Hajar Bonnett");
  await expect(dialog.getByLabel("Operations Secondary")).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.width).toBeLessThanOrEqual(390);
});
