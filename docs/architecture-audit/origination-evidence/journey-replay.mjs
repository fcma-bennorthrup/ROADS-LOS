/**
 * UI-only reproduction of the bounded synthetic Origination journey.
 * Use only against the isolated fixture at 127.0.0.1:4317.
 * No API/admin requests or PDF navigation are performed. Run in a fresh,
 * disposable browser context; the fixture supplies its fixed Date and stubs.
 *
 * This replay helper was not run by the verification session; observed results
 * are in browser-report.md. It deliberately leaves the rate-lock date draft
 * uncommitted and does not save the collateral Evaluation 1 draft.
 */
import { chromium } from "playwright";

const origin = "http://127.0.0.1:4317";
const blockedRequests = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ timezoneId: "UTC" });

await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    url.port === "4317"
  ) {
    return route.continue();
  }
  blockedRequests.push({
    url: url.href,
    resourceType: route.request().resourceType(),
  });
  return route.abort();
});

try {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/loans/synthetic-a/origination`);

  // Borrower edit, borrower switch, save, and section re-entry.
  await page.getByTestId("borrower-info-button-edit").click();
  await page.getByTestId("input-first-name").fill("Riley");
  await page.getByTestId("input-dob").fill("1981-06-23");
  await page.getByTestId("tab-borrower-jane").click();
  await page.getByTestId("tab-borrower-richard").click();
  await page.getByTestId("borrower-info-button-save").click();
  await page.getByTestId("nav-item-loan-details").click();
  await page.getByTestId("nav-item-borrower-information").click();
  console.log("borrower after re-entry", {
    firstName: await page.getByTestId("field-first-name").textContent().catch(() => null),
    dob: await page.getByTestId("field-dob").textContent().catch(() => null),
  });

  // Loan Details arbitrary-string save and discard.
  await page.getByTestId("nav-item-loan-details").click();
  await page.getByTestId("button-edit-loan-details").click();
  await page.getByTestId("textarea-tell-the-story").fill(
    "Synthetic details draft: amber-owl-42 / arbitrary text",
  );
  await page.getByTestId("button-save-loan-details").click();
  await page.getByTestId("button-edit-loan-details").click();
  await page.getByTestId("textarea-tell-the-story").fill(
    "Synthetic discarded draft: cobalt-fox-99",
  );
  await page.getByTestId("button-discard-loan-details").click();

  // Collateral split while editing; delete Evaluation 2 with Evaluation 1 draft.
  await page.getByTestId("nav-item-collateral").click();
  await page.getByTestId("value-button-edit").click();
  await page.getByTestId("button-split-appraisal").click();
  await page.getByTestId("input-estimated-value").fill("425000");
  await page.getByTestId("button-delete-evaluation").click();

  // Fixed-time duplicate fee collision, Save no-op, then delete one shared ID.
  await page.getByTestId("nav-item-fees").click();
  for (let i = 0; i < 2; i += 1) {
    await page.getByTestId("select-fee-type").click();
    await page.getByTestId("select-fee-type-option-appraisal-fee").click();
    await page.getByTestId("input-le-amount").fill("325.50");
    await page.getByTestId("input-cd-amount").fill("75.25");
    await page.getByTestId("button-add-fee").click();
  }
  const feeRowsBeforeSave = await page.locator('[data-testid^="fee-row-"]').count();
  await page.getByTestId("button-save-fee-table").click();
  const feeRowsAfterSave = await page.locator('[data-testid^="fee-row-"]').count();
  console.log("fee collision counts", { feeRowsBeforeSave, feeRowsAfterSave });
  await page.locator('[data-testid^="button-delete-fee-"]').first().click();
  console.log(
    "fee rows after deleting first collision",
    await page.locator('[data-testid^="fee-row-"]').count(),
  );

  // Lock the unsaved nondefault product, edit date, cancel/reopen, leave uncommitted.
  await page.getByTestId("nav-item-product-pricing").click();
  await page.getByTestId("button-edit-product").click();
  await page.getByTestId("select-product").click();
  await page.getByTestId("select-product-option-4371").click();
  await page.getByTestId("button-lock-rate").click();
  await page.getByTestId("button-confirm-lock-rate").click();
  await page.getByTestId("button-lock-rate").click();
  await page.getByTestId("input-lock-date").fill("2026-12-15");
  await page.keyboard.press("Escape");
  await page.getByTestId("button-lock-rate").click();
  console.log(
    "date after Escape/reopen",
    await page.getByTestId("input-lock-date").inputValue(),
  );
  await page.getByTestId("button-cancel-lock").click();
  await page.getByTestId("button-lock-rate").click();
  console.log(
    "date after Cancel/reopen",
    await page.getByTestId("input-lock-date").inputValue(),
  );
  await page.getByTestId("button-cancel-lock").click();
  console.log("blockedRequests", JSON.stringify(blockedRequests, null, 2));
} finally {
  await context.close();
  await browser.close();
}
