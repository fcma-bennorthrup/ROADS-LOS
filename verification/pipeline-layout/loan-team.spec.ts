import { expect, test, type Page } from "@playwright/test";
import type { PipelineLoan } from "../../shared/pipeline";

function fixtureLoan(id: string, loanNumber: string, loanOfficer: string, updatedAt: string): PipelineLoan {
  return {
    id, loanNumber, loanOfficer, updatedAt, primaryBorrowerName: `Synthetic ${id}`,
    loanType: "Purchase", stage: "Customer Application", amountRequested: 100000,
    product: null, mode: "empty", revision: 0, createdAt: "2026-11-01T12:00:00Z",
  };
}

async function isolatedLoans(page: Page, initial: PipelineLoan[]) {
  let loans = initial;
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => {
    const request = route.request();
    if (new URL(request.url()).pathname === "/api/loans" && request.method() === "GET") {
      return route.fulfill({ json: loans });
    }
    unexpected.push(`${request.method()} ${new URL(request.url()).pathname}`);
    return route.abort();
  });
  return {
    async refresh(next: PipelineLoan[]) {
      loans = next;
      const response = page.waitForResponse(response =>
        new URL(response.url()).pathname === "/api/loans" && response.request().method() === "GET");
      await page.evaluate(() => window.dispatchEvent(new Event("fixture:refresh-pipeline")));
      await response;
    },
    assertSafe() {
      expect(unexpected, "No writes or unexpected API traffic").toEqual([]);
      expect(errors, "No uncaught browser errors").toEqual([]);
    },
  };
}

async function expectTeam(page: Page, number: string, officer: string, support: string) {
  const dialog = page.getByRole("dialog", { name: "Loan Team" });
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toHaveAccessibleDescription(`Team assignments for loan ${number}. Read only.`);
  await expect(dialog.getByLabel("Originator Primary", { exact: true })).toHaveValue(officer);
  await expect(dialog.getByLabel("Sales Support Primary", { exact: true })).toHaveValue(support);
  await expect(dialog.getByLabel("Operations Primary", { exact: true })).toHaveValue("Not Assigned");
  for (const role of ["Originator", "Sales Support", "Operations"]) {
    await expect(dialog.getByLabel(`${role} Secondary`, { exact: true })).toHaveValue("Not Assigned");
  }
  for (const input of await dialog.getByRole("textbox").all()) {
    await expect(input).toHaveAttribute("readonly");
  }
}

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

  test(`loan teams retain identity through refresh and reordering at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const first = fixtureLoan("first", "100000001", "Sarah Williams", "2026-11-03T12:00:00Z");
    const second = fixtureLoan("second", "100000002", "Rylee Alcorn", "2026-11-02T12:00:00Z");
    const fixture = await isolatedLoans(page, [first, second]);
    await page.goto("/");
    const trigger = page.getByRole("button", { name: `View loan team for loan ${first.loanNumber}` });
    // Modal accessibility hiding must not hide the DOM-order assertion.
    const rowOrder = () => page.locator('tbody button[aria-label^="View loan team"]');
    await expect(rowOrder().first()).toHaveAttribute("aria-label", `View loan team for loan ${first.loanNumber}`);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expectTeam(page, first.loanNumber, "Sarah Williams", "Tyler Coke");

    // A real GET refresh changes both teams without replacing the selected loan.
    const updatedFirst = { ...first, loanOfficer: "Conner Welch" };
    const updatedSecond = { ...second, loanOfficer: "Unknown Officer" };
    await fixture.refresh([updatedFirst, updatedSecond]);
    await expectTeam(page, first.loanNumber, "Conner Welch", "Nikki Wheat");
    // Reverse response order AND the active updatedAt sort, not just array order.
    await fixture.refresh([{ ...updatedSecond, updatedAt: "2026-11-04T12:00:00Z" }, updatedFirst]);
    await expect(rowOrder().first()).toHaveAttribute("aria-label", `View loan team for loan ${second.loanNumber}`);
    await expectTeam(page, first.loanNumber, "Conner Welch", "Nikki Wheat");
    await page.keyboard.press("Tab");
    expect(await page.getByRole("dialog").evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    const otherTrigger = page.getByRole("button", { name: `View loan team for loan ${second.loanNumber}` });
    await otherTrigger.click();
    await expectTeam(page, second.loanNumber, "Unknown Officer", "Not Assigned");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(otherTrigger).toBeFocused();
    await trigger.click();
    await expectTeam(page, first.loanNumber, "Conner Welch", "Nikki Wheat");
    await page.getByRole("button", { name: "Close loan team", exact: true }).click();
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId("pipeline-page")).toBeVisible();
    fixture.assertSafe();
  });

  for (const empty of [false, true]) {
    test(`removed selected loan closes safely with ${empty ? "no" : "another"} row at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const first = fixtureLoan("first", "100000001", "Sarah Williams", "2026-11-03T12:00:00Z");
      const second = fixtureLoan("second", "100000002", "Rylee Alcorn", "2026-11-02T12:00:00Z");
      const fixture = await isolatedLoans(page, [first, second]);
      await page.goto("/");
      const trigger = page.getByRole("button", { name: `View loan team for loan ${first.loanNumber}` });
      await trigger.click();
      await expectTeam(page, first.loanNumber, "Sarah Williams", "Tyler Coke");
      await fixture.refresh(empty ? [] : [second]);
      await expect(trigger).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("searchbox", { name: "Filter table results" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("pipeline-page")).toBeVisible();
      if (!empty) {
        const remaining = page.getByRole("button", { name: `View loan team for loan ${second.loanNumber}` });
        await remaining.click();
        await expectTeam(page, second.loanNumber, "Rylee Alcorn", "Matthew Lewis");
        await page.keyboard.press("Escape");
        await expect(remaining).toBeFocused();
      }
      fixture.assertSafe();
    });
  }
}
