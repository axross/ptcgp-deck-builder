import { expect, type Page, test } from "@playwright/test";

// The full catalog size — the sum of every seeded set — asserted here as the
// browse baseline and checked against the catalog's own count assertions in the
// unit tests. Per-set sizes drive the cross-set filter test.
const A1_SIZE = 286;
const A1A_SIZE = 86;
const A2_SIZE = 207;
const A2A_SIZE = 96;
const A2B_SIZE = 111;
const A3_SIZE = 239;
const A3A_SIZE = 103;
const A3B_SIZE = 107;
const A4_SIZE = 241;
const A4A_SIZE = 105;
const CATALOG_SIZE =
  A1_SIZE +
  A1A_SIZE +
  A2_SIZE +
  A2A_SIZE +
  A2B_SIZE +
  A3_SIZE +
  A3A_SIZE +
  A3B_SIZE +
  A4_SIZE +
  A4A_SIZE;

// Identify a specific card by its stable data hook rather than matching on the
// rendered name (per e2e-testing-guidelines: text locators are for copy
// assertions only). Card ids are stable across art/rarity variants.
function cardTile(page: Page, id: string) {
  return page.locator(`[data-testid="card-tile"][data-card-id="${id}"]`);
}

// The first filter interaction on a freshly-loaded grid can land before Next.js
// hydrates the navigation and be silently dropped (the suite forbids
// retries/flakes). Retry the interaction until the URL reflects it; subsequent
// interactions in the same test then run against a hydrated page.
async function applyFirstFilter(page: Page, apply: () => Promise<unknown>, expectedUrl: RegExp) {
  await expect(async () => {
    await apply();
    await expect(page).toHaveURL(expectedUrl, { timeout: 2000 });
  }).toPass({ timeout: 15000 });
}

// Card art hotlinks an external CDN that is blocked in CI/sandboxes. Abort the
// image-optimizer requests so pages render fast and the suite stays independent
// of CDN reachability — otherwise hundreds of 403 retries per grid starve the
// dev server and make heavy navigations time out. The fallback rendering path
// has its own dedicated test that forces this failure explicitly.
test.beforeEach(async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
});

test.describe("card browser", () => {
  test("reaches the catalog from the home page (mobile + desktop) and browses the full grid", {
    tag: ["@scenario:cards.browse", "@area:cards", "@priority:must", "@smoke"],
  }, async ({ page }) => {
    // The header nav must reach /cards from home on both a narrow phone and a
    // desktop viewport (acceptance criterion); the grid checks then run at the
    // last (desktop) size.
    const viewports = [
      { label: "mobile", width: 375, height: 812 },
      { label: "desktop", width: 1280, height: 800 },
    ];
    for (const viewport of viewports) {
      await test.step(`Navigate to Cards from the home header on ${viewport.label}`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto("/");
        const cardsLink = page.getByTestId("app-header").getByTestId("app-header-nav-cards");
        await expect(cardsLink).toBeVisible();
        // Retry the click until it sticks: a click landing before Next.js has
        // hydrated the link can be dropped, and the suite forbids retries/flakes.
        await expect(async () => {
          await cardsLink.click();
          await expect(page).toHaveURL(/\/cards$/, { timeout: 2000 });
        }).toPass({ timeout: 15000 });
      });
    }

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
      await applyFirstFilter(
        page,
        () => page.getByTestId("card-filter-type").selectOption("Grass"),
        /[?&]type=Grass/,
      );

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

  test("filters by expansion set and the selection is URL-shareable", {
    tag: ["@scenario:cards.filter.set", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    // Several sets are seeded, so selecting one narrows the grid to just that
    // set's cards — real cross-set narrowing, not only that the control is
    // wired. The option labels come from the set registry.
    await page.goto("/cards");
    await expect(page.getByTestId("card-tile")).toHaveCount(CATALOG_SIZE);

    const setFilter = page.getByTestId("card-filter-set");
    await applyFirstFilter(page, () => setFilter.selectOption("A1"), /[?&]set=A1/);

    await expect(page.getByTestId("card-tile")).toHaveCount(A1_SIZE);
    await expect(page.getByTestId("card-result-count")).toHaveText(`${A1_SIZE} cards`);
    await expect(cardTile(page, "A1-001")).toBeVisible(); // Bulbasaur stays (A1)
    await expect(cardTile(page, "A2-001")).toHaveCount(0); // an A2 card drops out

    await test.step("Switching sets swaps the grid to the other set", async () => {
      await page.getByTestId("card-filter-set").selectOption("A2");

      await expect(page).toHaveURL(/[?&]set=A2/);
      await expect(page.getByTestId("card-tile")).toHaveCount(A2_SIZE);
      await expect(cardTile(page, "A2-001")).toBeVisible();
      await expect(cardTile(page, "A1-001")).toHaveCount(0);
    });

    await test.step("Set combines with another filter", async () => {
      await page.goto("/cards?set=A1");
      await applyFirstFilter(
        page,
        () => page.getByTestId("card-filter-type").selectOption("Grass"),
        /[?&]type=Grass/,
      );

      await expect(page).toHaveURL(/[?&]set=A1/);
      await expect(cardTile(page, "A1-001")).toBeVisible(); // Bulbasaur (A1, Grass)
      await expect(cardTile(page, "A1-033")).toHaveCount(0); // Charmander (A1, Fire)
      expect(await page.getByTestId("card-tile").count()).toBeLessThan(A1_SIZE);
    });

    await test.step("Opening the shared set URL fresh reproduces the grid", async () => {
      await page.goto("/cards?set=A2");

      await expect(page.getByTestId("card-tile")).toHaveCount(A2_SIZE);
      await expect(page.getByTestId("card-filter-set")).toHaveValue("A2");
    });
  });

  test("searches the catalog by card name", {
    tag: ["@scenario:cards.search", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/cards");
    await applyFirstFilter(
      page,
      () => page.getByTestId("card-filter-search").fill("pikachu"),
      /[?&]q=pikachu/,
    );

    await expect(cardTile(page, "A1-094")).toBeVisible(); // Pikachu
    expect(await page.getByTestId("card-tile").count()).toBeLessThan(CATALOG_SIZE);
  });

  test("shows the empty state and clears filters when nothing matches", {
    tag: ["@scenario:cards.empty-state", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/cards");
    await applyFirstFilter(
      page,
      () => page.getByTestId("card-filter-search").fill("zzzznomatch"),
      /[?&]q=zzzznomatch/,
    );

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
