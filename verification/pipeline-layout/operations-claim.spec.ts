import { expect, test } from "@playwright/test";
import { newLoanApplication } from "../../shared/loan-factory";
import { applyTridDemoAction } from "../../shared/business-rules/trid-demo-actions";
import { pipelineView } from "../../shared/pipeline";

for (const role of ["Operations", "Sales Support"] as const) {
test(`claims and edits ${role} with shared team visibility`, async ({ page }, testInfo) => {
  const sales = role === "Sales Support";
  const primary = sales ? "Tyler Coke" : "Megann Ziedes";
  const secondary = sales ? "Matthew Lewis" : "Taylor Beckham";
  const replacement = sales ? "Nikki Wheat" : "Hajar Bonnett";
  const queue = sales ? "queue-sales-support" : "queue-operations";
  await page.setViewportSize({ width: 1440, height: 1000 });
  let document = applyTridDemoAction(newLoanApplication({
    id: "claim-fixture", loanNumber: "100000001", source: "blank", borrowerCount: 1,
  }), "trid-manual");
  document.meta!.opportunity = { loanOfficer: "Sarah Williams", region: "500", applicationDate: "2026-11-12", queue: "Sales Support", decision: "" };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/loans") return route.fulfill({ json: [pipelineView(document)] });
    if (path === "/api/loans/claim-fixture/application") {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON();
        expect(body.revision).toBe(document.revision);
        expect(body.section).toBe(sales ? "sales-support-team" : "operations-team");
        document = { ...document, revision: document.revision + 1,
          sections: { ...document.sections, [body.section]: body.value } };
      }
      return route.fulfill({ json: document });
    }
    return route.abort();
  });
  await page.goto("/");
  await page.getByTestId(queue).click();
  const trigger = page.getByRole("button", { name: `Edit ${role} team for loan 100000001` });
  await expect(trigger).toHaveCSS("color", sales ? "rgb(39, 51, 51)" : "rgb(0, 91, 148)");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Loan Team Assignment" });
  if (!sales) await expect(dialog.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  else await expect(dialog.getByLabel(`${role} Primary`)).toHaveValue(primary);
  await dialog.getByLabel(`${role} Primary`).selectOption(primary);
  await expect(dialog.getByLabel(`${role} Secondary`).locator(`option[value="${primary}"]`)).toBeDisabled();
  await dialog.getByLabel(`${role} Secondary`).selectOption(secondary);
  await page.screenshot({ path: testInfo.outputPath("operations-claim.png") });
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toHaveCSS("color", "rgb(39, 51, 51)");
  await page.getByTestId("queue-all-loans").click();
  await page.getByRole("button", { name: /View loan team/ }).click();
  await expect(page.getByLabel(`${role} Primary`)).toHaveValue(primary);
  await expect(page.getByLabel(`${role} Secondary`)).toHaveValue(secondary);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByTestId(queue).click();
  await trigger.click();
  await expect(dialog.getByLabel(`${role} Primary`)).toHaveValue(primary);
  await dialog.getByLabel(`${role} Primary`).selectOption(replacement);
  await dialog.getByLabel(`${role} Secondary`).selectOption("");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await expect(dialog.getByLabel(`${role} Primary`)).toHaveValue(replacement);
  await expect(dialog.getByLabel(`${role} Secondary`)).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.width).toBeLessThanOrEqual(390);
});
}
