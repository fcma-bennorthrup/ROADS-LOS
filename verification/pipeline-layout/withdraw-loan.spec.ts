import { expect, test } from "@playwright/test";

test("withdrawal confirms acknowledgment and keeps the row visible after reload", async ({ page }, testInfo) => {
  let withdrawn = false;
  let writes = 0;
  await page.route("**/api/**", route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/loans") return route.fulfill({ json: [{
      id: "withdraw-fixture", loanNumber: "100000001", primaryBorrowerName: "Synthetic Borrower",
      loanType: "Purchase", stage: "Customer Application", withdrawn, amountRequested: 100000,
      product: null, mode: "empty", revision: writes, departmentQueue: "Sales Support",
      createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-01T12:00:00Z",
    }] });
    if (path === "/api/loans/withdraw-fixture/application") {
      if (request.method() === "PUT") {
        expect(request.postDataJSON()).toMatchObject({ section: "withdrawal", value: { acknowledged: true } });
        withdrawn = true;
        writes++;
      }
      return route.fulfill({ json: { generation: 0, revision: writes } });
    }
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "More actions for loan 100000001" }).click();
  await page.getByRole("menuitem", { name: "Withdraw Loan" }).click();
  const dialog = page.getByRole("dialog", { name: "Withdraw Loan" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Withdraw Loan", exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("withdraw-dialog.png") });
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "More actions for loan 100000001" }).click();
  await page.getByRole("menuitem", { name: "Withdraw Loan" }).click();
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Withdraw Loan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("pipeline-row-withdraw-fixture")).toContainText("Withdrawn");
  await page.reload();
  await expect(page.getByTestId("pipeline-row-withdraw-fixture")).toContainText("Withdrawn");
  expect(writes).toBe(1);
});
