import { expect, test } from "@playwright/test";
import { newLoanApplication } from "../../shared/loan-factory";
import { applicationView } from "../../shared/loan-application";

for (const width of [1440, 390]) {
  test(`withdrawn header remains visible across tabs at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const saved = newLoanApplication({ id: "withdrawn-header", loanNumber: "100000001",
      source: "blank", borrowerCount: 1, now: "2026-11-11T12:00:00Z" });
    saved.sections.withdrawal = { acknowledged: true };
    saved.loan.stage = "Decisioning";
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === "/api/loans/withdrawn-header/application") {
        if (request.method() === "PUT") {
          const { section, value } = request.postDataJSON();
          saved.sections[section] = value;
          saved.revision++;
        }
        return route.fulfill({ json: saved });
      }
      if (path === "/api/loans/withdrawn-header") return route.fulfill({ json: applicationView(saved) });
      return route.abort();
    });
    await page.goto("/loans/withdrawn-header");
    await expect(page.getByTestId("chip-withdrawn")).toHaveText("Withdrawn");
    await expect(page.getByTestId("withdrawn-stage-label")).toContainText("Decisioning");
    await expect(page.locator('[aria-current="step"]')).toHaveCSS("background-color", "rgb(222, 225, 225)");
    await page.screenshot({ path: info.outputPath("withdrawn-header.png") });
    for (const tab of ["origination", "closing-booking", "history"]) {
      await page.getByTestId(`tab-${tab}`).click();
      await expect(page.getByTestId("withdrawn-notice")).toBeVisible();
      await expect(page.getByTestId("chip-withdrawn")).toBeVisible();
    }
    expect(saved.loan.stage).toBe("Decisioning");
    expect(errors).toEqual([]);
  });
}
