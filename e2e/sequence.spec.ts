import { expect, test } from "@playwright/test";

test("tracks the two-player game-turn sequence and rolls over after interphase", async ({
  page,
}) => {
  await page.goto("/");

  const tracker = page.locator(".board-card .sequence-card");
  const steps = tracker.locator("[data-sequence-step]");
  await expect(
    tracker.getByRole("heading", { name: "Two-player phase tracker" }),
  ).toBeVisible();
  await expect(steps).toHaveCount(9);
  await expect(tracker.locator("[data-sequence-turn]")).toHaveText("1");
  await expect(steps.nth(0)).toHaveAttribute("data-status", "current");
  await expect(steps.nth(0)).toHaveAttribute("data-lane", "player1");
  await expect(steps.nth(4)).toHaveAttribute("data-lane", "player2");

  const advance = tracker.getByRole("button", { name: "Advance phase" });
  await advance.click();
  await expect(steps.nth(1)).toHaveAttribute("data-status", "current");
  await expect(steps.nth(0)).toHaveAttribute("data-status", "complete");
  await expect(steps.nth(1)).toContainText("Attrition Segment");
  await expect(steps.nth(2)).toContainText("Current Player rolls · Player 1");
  await expect(steps.nth(6)).toContainText("Current Player rolls · Player 2");

  await advance.click();
  await advance.click();
  await advance.click();
  await expect(steps.nth(4)).toHaveAttribute("data-status", "current");
  await expect(steps.nth(4)).toHaveAttribute("aria-current", "step");

  for (let index = 0; index < 4; index += 1) {
    await advance.click();
  }
  await expect(steps.nth(8)).toHaveAttribute("data-status", "current");
  await expect(tracker.locator("[data-sequence-current]")).toContainText(
    "Game-Turn Interphase",
  );

  await advance.click();
  await expect(tracker.locator("[data-sequence-turn]")).toHaveText("2");
  await expect(steps.nth(0)).toHaveAttribute("data-status", "current");
  await expect(steps.nth(8)).toHaveAttribute("data-status", "upcoming");
});
