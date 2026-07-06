import { expect, type Page, test } from "@playwright/test";

// The full A1 catalog size — asserted here as the browse baseline and checked
// against the catalog's own count assertions in the unit tests.
const CATALOG_SIZE = 286;

// Identify a specific card by its stable data hook rather than matching on the
// rendered name (per e2e-testing-guidelines: text locators are for copy
// assertions only). Card ids are stable across art/rarity variants.
function cardTile(page: Page, id: string) {
  return page.locator(`[data-testid="card-tile"][data-card-id="${id}"]`);
}

test.describe("card browser", () => {
  test("reaches the catalog from the home page and browses the full grid", {
    tag: ["@scenario:cards.browse", "@area:cards", "@priority:must", "@smoke"],
  }, async ({ page }) => {
    await test.step("Navigate to Cards from the home page header", async () => {
      await page.goto("/");
      const cardsLink = page.getByTestId("app-header").getByTestId("app-header-nav-cards");
      // Retry the click until it sticks: a click landing before Next.js has
      // hydrated the link can be dropped, and the suite forbids retries/flakes.
      await expect(async () => {
        await cardsLink.click();
        await expect(page).toHaveURL(/\/cards$/, { timeout: 2000 });
      }).toPass({ timeout: 15000 });
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
      await expect(cardTile(page, "A1-001")).toBeVisible(); // Bulbasaur (Grass, Basic)
      await expect(cardTile(page, "A1-033")).toHaveCount(0); // Charmander (Fire)
    });

    const grassCount = await tiles.count();
    expect(grassCount).toBeGreaterThan(0);
    expect(grassCount).toBeLessThan(CATALOG_SIZE);

    await test.step("Combined filters intersect", async () => {
      await page.getByTestId("card-filter-kind").selectOption("Basic");

      await expect(page).toHaveURL(/[?&]kind=Basic/);
      await expect(cardTile(page, "A1-001")).toBeVisible(); // Bulbasaur is Basic
      await expect(cardTile(page, "A1-003")).toHaveCount(0); // Venusaur is Grass but Stage 2
      expect(await tiles.count()).toBeLessThan(grassCount);
    });

    await test.step("Opening a shared filtered URL fresh reproduces the grid", async () => {
      await page.goto("/cards?type=Grass");

      await expect(tiles).toHaveCount(grassCount);
      await expect(cardTile(page, "A1-001")).toBeVisible();
    });
  });

  test("searches the catalog by card name", {
    tag: ["@scenario:cards.search", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/cards");
    await page.getByTestId("card-filter-search").fill("pikachu");

    await expect(page).toHaveURL(/[?&]q=pikachu/);
    await expect(cardTile(page, "A1-094")).toBeVisible(); // Pikachu
    expect(await page.getByTestId("card-tile").count()).toBeLessThan(CATALOG_SIZE);
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

  test("renders the data-driven fallback when a card image fails to load", {
    tag: ["@scenario:cards.image-fallback", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    // Force every card image to fail so the fallback path is exercised
    // deterministically, independent of CDN reachability.
    await page.route(/\/_next\/image/, (route) => route.abort());
    await page.goto("/cards");

    const fallback = cardTile(page, "A1-001").getByTestId("card-image-fallback");
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText("Bulbasaur"); // the data-driven frame shows the name
  });
});
