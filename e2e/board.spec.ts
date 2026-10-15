import { expect, test } from "@playwright/test";

test("renders the board and lets a player inspect a hex", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "The Sorcerer Board" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hexes of Color" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open the Color Value Chart" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open the Combat Test Bench" }),
  ).toBeVisible();
  await expect(page.locator(".chart-link-separator")).toHaveText("|");
  await expect(
    page
      .getByRole("group", { name: "Sorcerer 23-column hex board" })
      .locator(".hex"),
  ).toHaveCount(518);

  const hex = page.getByRole("button", { name: /^Hex 1810,/ });
  await hex.click();

  await expect(page.locator("#selection-title")).toHaveText(/^1810 · /);
  await expect(page.locator("#selection-detail")).toContainText("1810");
  await expect(hex).toHaveClass(/is-selected/);
});

test("supports keyboard hex selection and map zoom controls", async ({
  page,
}) => {
  await page.goto("/");

  const hex = page.getByRole("button", { name: /^Hex 0101,/ });
  await hex.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#selection-title")).toHaveText(/^0101 · /);

  await page.getByRole("button", { name: "Zoom map in" }).click();
  await expect(page.locator(".map-scale")).toHaveText("125%");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator(".map-scale")).toHaveText("100%");
});
