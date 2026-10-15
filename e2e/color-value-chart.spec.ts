import { expect, test } from "@playwright/test";

test("renders the chart and navigates back to the board", async ({ page }) => {
  await page.goto("/color-value-chart.html");

  await expect(
    page.getByRole("heading", { name: "Color Value Chart" }),
  ).toBeVisible();
  await expect(page.locator("#chart svg g.hex")).toHaveCount(36);

  await page.getByRole("link", { name: "Back to the Game Board" }).click();
  await expect(
    page.getByRole("heading", { name: "The Sorcerer Board" }),
  ).toBeVisible();
});
