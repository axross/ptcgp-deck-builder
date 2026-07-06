import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("shows the deck builder landing page", {
    tag: ["@scenario:home.landing", "@area:home", "@priority:must", "@smoke"],
  }, async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("home-title")).toHaveText("PTCGP Deck Builder");
  });
});
