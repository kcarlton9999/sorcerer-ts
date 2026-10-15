import { expect, test } from "@playwright/test";

test("updates a matchup and displays a valid combat result", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/combat-test.html");

  await expect(
    page.getByRole("heading", { name: "Combat Results" }),
  ).toBeVisible();
  await expect(page.locator("#combat-line")).toHaveText("poor");

  await page.getByRole("button", { name: "green attacker color" }).click();
  await expect(
    page.getByRole("button", { name: "green attacker color" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#combat-line")).toHaveText("best");

  await page.getByRole("button", { name: "Roll the die" }).click();
  await expect(page.locator(".die-readout .die-face")).toHaveText("1");
  await expect(page.locator(".outcome-readout .outcome")).toHaveText(
    "2 steps lost",
  );
});
