import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("shows the deck builder landing page", {
    tag: ["@scenario:home.landing", "@area:home", "@priority:must", "@smoke"],
  }, async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("home-title")).toHaveText("PTCGP Deck Builder");
  });

  test("shows the site-wide unofficial / non-affiliation footer disclaimer", {
    tag: ["@scenario:app.footer.disclaimer", "@area:home", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/");

    const footer = page.getByTestId("app-footer");
    await expect(footer).toContainText("unofficial");
    await expect(footer).toContainText("not affiliated with");
    await expect(footer).toContainText("Limitless TCG");
  });
});
