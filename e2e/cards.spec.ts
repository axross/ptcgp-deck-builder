import { expect, test } from "@playwright/test";

// The full A1 catalog size — asserted here as the browse baseline and checked
// against the catalog's own count assertions in the unit tests.
const CATALOG_SIZE = 286;

test.describe("card browser", () => {
  test("reaches the catalog from the home page and browses the full grid", {
    tag: ["@scenario:cards.browse", "@area:cards", "@priority:must", "@smoke"],
  }, async ({ page }) => {
    await test.step("Navigate to Cards from the home page header", async () => {
      await page.goto("/");
      await page.getByTestId("app-header").getByTestId("app-header-nav-cards").click();
      await expect(page).toHaveURL(/\/cards$/);
    });

    await expect(page.getByTestId("card-grid")).toBeVisible();
    await expect(page.getByTestId("card-tile")).toHaveCount(CATALOG_SIZE);
    await expect(page.getByTestId("card-result-count")).toHaveText(`${CATALOG_SIZE} cards`);
  });

  test("filters the grid and the filtered view is URL-shareable", {
    tag: ["@scenario:cards.filter", "@area:cards", "@priority:must"],
  }, async ({ page }) => {
    const tiles = page.getByTestId("card-tile");

    await test.step("Filtering by type narrows the grid and updates the URL", async () => {
      await page.goto("/cards");
      await page.getByTestId("card-filter-type").selectOption("Grass");

      await expect(page).toHaveURL(/[?&]type=Grass/);
      // Bulbasaur has two art variants in the catalog — assert at least one tile.
      await expect(tiles.filter({ hasText: "Bulbasaur" }).first()).toBeVisible();
      await expect(tiles.filter({ hasText: "Charmander" })).toHaveCount(0);
    });

    const grassCount = await tiles.count();
    expect(grassCount).toBeGreaterThan(0);
    expect(grassCount).toBeLessThan(CATALOG_SIZE);

    await test.step("Combined filters intersect", async () => {
      await page.getByTestId("card-filter-kind").selectOption("Basic");

      await expect(page).toHaveURL(/[?&]kind=Basic/);
      await expect(tiles.filter({ hasText: "Bulbasaur" }).first()).toBeVisible();
      await expect(tiles.filter({ hasText: "Venusaur" })).toHaveCount(0); // Grass but Stage 2
      expect(await tiles.count()).toBeLessThan(grassCount);
    });

    await test.step("Opening a shared filtered URL fresh reproduces the grid", async () => {
      await page.goto("/cards?type=Grass");

      await expect(tiles).toHaveCount(grassCount);
      await expect(tiles.filter({ hasText: "Bulbasaur" }).first()).toBeVisible();
    });
  });

  test("searches the catalog by card name", {
    tag: ["@scenario:cards.search", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/cards");
    await page.getByTestId("card-filter-search").fill("pikachu");

    await expect(page).toHaveURL(/[?&]q=pikachu/);
    const tiles = page.getByTestId("card-tile");
    await expect(tiles.filter({ hasText: "Pikachu" })).not.toHaveCount(0);
    expect(await tiles.count()).toBeLessThan(CATALOG_SIZE);
  });

  test("shows the empty state and clears filters when nothing matches", {
    tag: ["@scenario:cards.empty-state", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/cards");
    await page.getByTestId("card-filter-search").fill("zzzznomatch");

    await expect(page.getByTestId("cards-empty-state")).toBeVisible();
    await expect(page.getByTestId("cards-empty-state")).toContainText(
      "No cards match these filters.",
    );
    await expect(page.getByTestId("card-tile")).toHaveCount(0);

    await test.step("Clearing filters restores the full grid", async () => {
      await page.getByTestId("cards-empty-clear").click();

      await expect(page).toHaveURL(/\/cards$/);
      await expect(page.getByTestId("card-grid")).toBeVisible();
      await expect(page.getByTestId("card-result-count")).toHaveText(`${CATALOG_SIZE} cards`);
    });
  });
});
