import { expect, test } from "@playwright/test";

test("Operations uses brand assignment icons without changing other queues", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 2200, height: 1100 });
  await page.route("**/api/**", route => {
    if (new URL(route.request().url()).pathname !== "/api/loans" || route.request().method() !== "GET")
      return route.abort();
    return route.fulfill({ json: [{
      id: "operations-fixture", loanNumber: "100000001", primaryBorrowerName: "Synthetic Borrower",
      loanType: "Purchase", stage: "Customer Application", amountRequested: 100000,
      product: null, mode: "empty", revision: 1, departmentQueue: "Sales Support",
      operationsEligible: true, createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-01T12:00:00Z",
      tridTriggeredAt: new Date().toISOString(), tridStatus: "required", closingDate: "11/25/2026",
    }] });
  });
  await page.goto("/");
  await expect(page.getByTestId("queue-operations")).toContainText("1 Loans");
  await page.getByTestId("queue-operations").click();
  const assign = page.getByRole("button", { name: /Assign loan/ });
  await expect(assign).toBeDisabled();
  await expect(assign).toHaveCSS("color", "rgb(0, 91, 148)");
  await expect(page.getByRole("button", { name: /Preview loan/ })).toHaveCSS("color", "rgb(39, 51, 51)");
  await expect(page.getByTestId("pipeline-row-operations-fixture").getByRole("cell")).toHaveCount(14);
  await expect(page.getByLabel("TRID day 0")).toHaveCSS("background-color", "rgb(234, 234, 249)");
  await expect(page.getByText("11/25/2026")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("operations.png") });
  await page.getByTestId("queue-sales-support").click();
  await expect(assign).toHaveCSS("color", "rgb(39, 51, 51)");
  await page.getByTestId("queue-all-loans").click();
  await expect(page.getByRole("button", { name: /View loan team/ })).toHaveCSS("color", "rgb(39, 51, 51)");
});
