import { expect, type Page, test } from "@playwright/test";

// The full catalog size — the sum of the seeded sets (A1 + A1a + A2 + A2a) —
// asserted here via the result count (the grid itself is virtualized and never
// mounts the whole catalog) and checked against the catalog's own count
// assertions in the unit tests. Per-set sizes drive the cross-set filter test.
const A1_SIZE = 286;
const A1A_SIZE = 86;
const A2_SIZE = 207;
const A2A_SIZE = 96;
const CATALOG_SIZE = A1_SIZE + A1A_SIZE + A2_SIZE + A2A_SIZE;

// The last card of the last seeded set in catalog order; scrolling to the end
// of the grid must reach it even though the grid is windowed.
const LAST_CARD_ID = "A2a-096";

// The grid is virtualized: the mounted tile count tracks the viewport (rows in
// view plus a small overscan), never the catalog. This cap is far above any
// real window at the test viewport (measured ~30–55 tiles) but far below the
// catalog, so it fails loudly if virtualization regresses to render-everything.
const MAX_MOUNTED_TILES = 120;

// Identify a specific card by its stable data hook rather than matching on the
// rendered name (per e2e-testing-guidelines: text locators are for copy
// assertions only). Card ids are stable across art/rarity variants.
function cardTile(page: Page, id: string) {
  return page.locator(`[data-testid="card-tile"][data-card-id="${id}"]`);
}

// The virtualized grid flips data-virtualized to "true" only after hydration
// and its first client-side measurement, so this is a deterministic
// "page is interactive" wait before the first filter interaction — replacing
// the retry-until-it-sticks workarounds the heavy full-catalog pages needed.
async function expectGridReady(page: Page) {
  await expect(page.getByTestId("card-grid")).toHaveAttribute("data-virtualized", "true");
}

// The filtered total is exposed through the result count copy ("90 cards");
// the mounted tile count can no longer stand in for it under virtualization.
async function resultTotal(page: Page): Promise<number> {
  const text = (await page.getByTestId("card-result-count").textContent()) ?? "";
  const total = Number.parseInt(text, 10);
  expect(Number.isNaN(total), `result count text "${text}" should start with a number`).toBe(false);
  return total;
}

// Card art hotlinks an external CDN that is blocked in CI/sandboxes. Abort the
// image-optimizer requests so pages render fast and the suite stays independent
// of CDN reachability. The fallback rendering path has its own dedicated test
// that forces this failure explicitly.
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
        await cardsLink.click();
        // Headroom for the dev server compiling the route on its first hit.
        await expect(page).toHaveURL(/\/cards$/, { timeout: 15000 });
      });
    }

    await test.step("The full catalog is reported, but only a viewport-bounded window is mounted", async () => {
      await expect(page.getByTestId("card-grid")).toBeVisible();
      await expect(page.getByTestId("card-result-count")).toHaveText(`${CATALOG_SIZE} cards`);
      await expectGridReady(page);

      const mounted = await page.getByTestId("card-tile").count();
      expect(mounted).toBeGreaterThan(0);
      expect(mounted).toBeLessThan(MAX_MOUNTED_TILES);
    });

    await test.step("Scrolling to the end of the grid reaches the catalog's last card", async () => {
      await page.keyboard.press("End");
      await expect(cardTile(page, LAST_CARD_ID)).toBeVisible();
    });
  });

  test("filters the grid and the filtered view is URL-shareable", {
    tag: ["@scenario:cards.filter", "@area:cards", "@priority:must"],
  }, async ({ page }) => {
    let grassTotal = 0;

    await test.step("Filtering by type narrows the grid and updates the URL", async () => {
      await page.goto("/cards");
      await expectGridReady(page);
      await page.getByTestId("card-filter-type").selectOption("Grass");
      await expect(page).toHaveURL(/[?&]type=Grass/);

      await expect(cardTile(page, "A1-001")).toBeVisible(); // Bulbasaur (Grass, Basic)
      await expect(cardTile(page, "A1-033")).toHaveCount(0); // Charmander (Fire)

      grassTotal = await resultTotal(page);
      expect(grassTotal).toBeGreaterThan(0);
      expect(grassTotal).toBeLessThan(CATALOG_SIZE);
    });

    await test.step("Combined filters intersect", async () => {
      await page.getByTestId("card-filter-kind").selectOption("Basic");

      await expect(page).toHaveURL(/[?&]kind=Basic/);
      await expect(cardTile(page, "A1-001")).toBeVisible(); // Bulbasaur is Basic
      await expect(cardTile(page, "A1-003")).toHaveCount(0); // Venusaur is Grass but Stage 2
      expect(await resultTotal(page)).toBeLessThan(grassTotal);
    });

    await test.step("Opening a shared filtered URL fresh reproduces the result", async () => {
      await page.goto("/cards?type=Grass");

      await expect(page.getByTestId("card-result-count")).toHaveText(`${grassTotal} cards`);
      await expect(cardTile(page, "A1-001")).toBeVisible();
    });
  });

  test("filters by expansion set and the selection is URL-shareable", {
    tag: ["@scenario:cards.filter.set", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    // Several sets are seeded, so selecting one narrows the result to just that
    // set's cards — real cross-set narrowing, not only that the control is
    // wired. The option labels come from the set registry.
    await page.goto("/cards");
    await expect(page.getByTestId("card-result-count")).toHaveText(`${CATALOG_SIZE} cards`);
    await expectGridReady(page);

    await page.getByTestId("card-filter-set").selectOption("A1");
    await expect(page).toHaveURL(/[?&]set=A1/);

    await expect(page.getByTestId("card-result-count")).toHaveText(`${A1_SIZE} cards`);
    await expect(cardTile(page, "A1-001")).toBeVisible(); // Bulbasaur stays (A1)
    await expect(cardTile(page, "A2-001")).toHaveCount(0); // an A2 card drops out

    await test.step("Switching sets swaps the grid to the other set", async () => {
      await page.getByTestId("card-filter-set").selectOption("A2");

      await expect(page).toHaveURL(/[?&]set=A2/);
      await expect(page.getByTestId("card-result-count")).toHaveText(`${A2_SIZE} cards`);
      await expect(cardTile(page, "A2-001")).toBeVisible();
      await expect(cardTile(page, "A1-001")).toHaveCount(0);
    });

    await test.step("Set combines with another filter", async () => {
      await page.goto("/cards?set=A1");
      await expectGridReady(page);
      await page.getByTestId("card-filter-type").selectOption("Grass");
      await expect(page).toHaveURL(/[?&]type=Grass/);

      await expect(page).toHaveURL(/[?&]set=A1/);
      await expect(cardTile(page, "A1-001")).toBeVisible(); // Bulbasaur (A1, Grass)
      await expect(cardTile(page, "A1-033")).toHaveCount(0); // Charmander (A1, Fire)
      expect(await resultTotal(page)).toBeLessThan(A1_SIZE);
    });

    await test.step("Opening the shared set URL fresh reproduces the result", async () => {
      await page.goto("/cards?set=A2");

      await expect(page.getByTestId("card-result-count")).toHaveText(`${A2_SIZE} cards`);
      await expect(page.getByTestId("card-filter-set")).toHaveValue("A2");
    });
  });

  test("searches the catalog by card name", {
    tag: ["@scenario:cards.search", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/cards");
    await expectGridReady(page);
    await page.getByTestId("card-filter-search").fill("pikachu");
    await expect(page).toHaveURL(/[?&]q=pikachu/);

    await expect(cardTile(page, "A1-094")).toBeVisible(); // Pikachu
    expect(await resultTotal(page)).toBeLessThan(CATALOG_SIZE);
  });

  test("shows the empty state and clears filters when nothing matches", {
    tag: ["@scenario:cards.empty-state", "@area:cards", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/cards");
    await expectGridReady(page);
    await page.getByTestId("card-filter-search").fill("zzzznomatch");
    await expect(page).toHaveURL(/[?&]q=zzzznomatch/);

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
