import { expect, type Page, test } from "@playwright/test";

// Ten distinct-name A1 Basic Pokémon; two copies of each build a legal 20-card
// deck (all Basic satisfies the "at least one Basic" rule, ≤2 per name).
const BASIC_IDS = [
  "A1-001",
  "A1-005",
  "A1-008",
  "A1-011",
  "A1-014",
  "A1-016",
  "A1-018",
  "A1-021",
  "A1-024",
  "A1-025",
];

const STORAGE_KEY = "ptcgp-deck-builder:decks";

function tileAdd(page: Page, id: string) {
  return page
    .locator(`[data-testid="deck-picker-tile"][data-card-id="${id}"]`)
    .getByTestId("deck-picker-add");
}

function deckEntry(page: Page, id: string) {
  return page.locator(`[data-testid="deck-entry"][data-card-id="${id}"]`);
}

/** Seeds one saved deck into localStorage before the page loads. */
async function seedDeck(
  page: Page,
  deck: { id: string; name: string; cards: string[]; energyTypes: string[] },
) {
  await page.addInitScript(
    ([key, envelope]) => {
      window.localStorage.setItem(key, envelope);
    },
    [STORAGE_KEY, JSON.stringify({ version: 1, decks: [deck] })] as const,
  );
}

/** Seeds several saved decks into localStorage before the page first loads. */
async function seedDecks(
  page: Page,
  decks: { id: string; name: string; cards: string[]; energyTypes: string[] }[],
) {
  await page.addInitScript(
    ([key, envelope]) => {
      // The init script re-runs on every navigation, including reloads. Seed
      // only when nothing is saved yet so app-made changes (e.g. a deletion)
      // survive a reload instead of being clobbered by a re-seed.
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, envelope);
      }
    },
    [STORAGE_KEY, JSON.stringify({ version: 1, decks })] as const,
  );
}

function summaryCard(page: Page, id: string) {
  return page.locator(`[data-testid="deck-summary"][data-deck-id="${id}"]`);
}

const legalDeckCards = BASIC_IDS.flatMap((id) => [id, id]);

test.describe("deck editor", () => {
  test("builds a legal 20-card deck, saves it, and it survives reload", {
    tag: ["@scenario:deck.create.save", "@area:decks", "@priority:must", "@smoke"],
  }, async ({ page }) => {
    await page.goto("/decks/new");

    await test.step("Add cards until the deck reaches 20", async () => {
      // Land the first add under a retry so a pre-hydration click can't be
      // dropped (the suite forbids retries/flakes); once it sticks the rest of
      // the clicks are reliable.
      const firstAdd = tileAdd(page, BASIC_IDS[0]);
      await expect(async () => {
        await firstAdd.click();
        await expect(page.getByTestId("deck-card-count")).toContainText("1 / 20", {
          timeout: 1500,
        });
      }).toPass({ timeout: 15000 });
      await firstAdd.click(); // second copy of the first card

      for (const id of BASIC_IDS.slice(1)) {
        const add = tileAdd(page, id);
        await add.click();
        await add.click();
      }

      await expect(page.getByTestId("deck-card-count")).toContainText("20 / 20");
    });

    await test.step("A deck with no energy registered is not yet legal", async () => {
      await expect(page.getByTestId("deck-legality")).toHaveAttribute("data-legal", "false");
    });

    await test.step("Registering an energy type makes the deck legal", async () => {
      await page.getByTestId("deck-energy-Grass").click();
      await expect(page.getByTestId("deck-legality")).toHaveAttribute("data-legal", "true");
    });

    await test.step("Naming and saving persists the deck and adopts its id in the URL", async () => {
      await page.getByTestId("deck-name-input").fill("My grass deck");
      await page.getByTestId("deck-save-button").click();

      await expect(page.getByTestId("deck-save-message")).toHaveAttribute("data-status", "success");
      await expect(page).toHaveURL(/\/decks\/[^/]+\/edit$/);
    });

    await test.step("The saved deck reloads with the same cards, name, and energy", async () => {
      await page.reload();

      await expect(page.getByTestId("deck-card-count")).toContainText("20 / 20");
      await expect(page.getByTestId("deck-name-input")).toHaveValue("My grass deck");
      await expect(page.getByTestId("deck-energy-Grass")).toHaveAttribute("data-selected", "true");
      await expect(deckEntry(page, BASIC_IDS[0]).getByTestId("deck-entry-count")).toHaveText("×2");
    });
  });

  test("surfaces the deck-size violation live when a card is removed", {
    tag: ["@scenario:deck.validation.live", "@area:decks", "@priority:must"],
  }, async ({ page }) => {
    await seedDeck(page, {
      id: "seed-legal",
      name: "Seeded legal",
      cards: legalDeckCards,
      energyTypes: ["Grass"],
    });
    await page.goto("/decks/seed-legal/edit");

    await expect(page.getByTestId("deck-legality")).toHaveAttribute("data-legal", "true");
    await expect(page.getByTestId("deck-violations")).toHaveCount(0);

    await test.step("Removing one card drops the deck below 20 and shows the violation", async () => {
      await deckEntry(page, BASIC_IDS[0]).getByTestId("deck-entry-remove").click();

      await expect(page.getByTestId("deck-card-count")).toContainText("19 / 20");
      await expect(page.getByTestId("deck-violations")).toContainText("exactly 20 cards");
      await expect(page.getByTestId("deck-legality")).toHaveAttribute("data-legal", "false");
    });
  });

  test("registers between one and three energy types from the registrable set", {
    tag: ["@scenario:deck.energy.register", "@area:decks", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/decks/new");

    await test.step("Colorless and Dragon are not offered", async () => {
      await expect(page.getByTestId("deck-energy-Colorless")).toHaveCount(0);
      await expect(page.getByTestId("deck-energy-Dragon")).toHaveCount(0);
    });

    await test.step("Registration caps at three types", async () => {
      await page.getByTestId("deck-energy-Grass").click();
      await page.getByTestId("deck-energy-Fire").click();
      await page.getByTestId("deck-energy-Water").click();
      await page.getByTestId("deck-energy-Psychic").click();

      await expect(page.getByTestId("deck-energy-Grass")).toHaveAttribute("data-selected", "true");
      await expect(page.getByTestId("deck-energy-Fire")).toHaveAttribute("data-selected", "true");
      await expect(page.getByTestId("deck-energy-Water")).toHaveAttribute("data-selected", "true");
      await expect(page.getByTestId("deck-energy-Psychic")).toHaveAttribute(
        "data-selected",
        "false",
      );
    });
  });

  test("shows a visible error and does not crash when storage rejects the write", {
    tag: ["@scenario:deck.save.failure", "@area:decks", "@priority:may"],
  }, async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      };
    });
    await page.goto("/decks/new");

    const firstAdd = tileAdd(page, BASIC_IDS[0]);
    await expect(async () => {
      await firstAdd.click();
      await expect(page.getByTestId("deck-card-count")).toContainText("1 / 20", { timeout: 1500 });
    }).toPass({ timeout: 15000 });

    await page.getByTestId("deck-save-button").click();

    await expect(page.getByTestId("deck-save-message")).toHaveAttribute("data-status", "error");
    // The editor is still interactive, not crashed.
    await expect(page.getByTestId("deck-editor")).toBeVisible();
  });

  test("reopens a saved deck to edit and shows not-found for an unknown id", {
    tag: ["@scenario:deck.edit.existing", "@area:decks", "@priority:must"],
  }, async ({ page }) => {
    await seedDeck(page, {
      id: "seed-edit",
      name: "Water deck",
      cards: ["A1-053", "A1-053"],
      energyTypes: ["Water"],
    });

    await test.step("An existing deck loads its name, energy, and cards", async () => {
      await page.goto("/decks/seed-edit/edit");

      await expect(page.getByTestId("deck-name-input")).toHaveValue("Water deck");
      await expect(page.getByTestId("deck-energy-Water")).toHaveAttribute("data-selected", "true");
      await expect(deckEntry(page, "A1-053").getByTestId("deck-entry-count")).toHaveText("×2");
    });

    await test.step("An unknown deck id shows the not-found state instead of crashing", async () => {
      await page.goto("/decks/does-not-exist/edit");

      await expect(page.getByTestId("deck-not-found")).toBeVisible();
    });
  });
});

test.describe("deck list", () => {
  test("lists every saved deck with its summary and they survive a reload", {
    tag: ["@scenario:decks.list.view", "@area:decks", "@priority:must"],
  }, async ({ page }) => {
    await seedDecks(page, [
      { id: "list-legal", name: "Grass legal", cards: legalDeckCards, energyTypes: ["Grass"] },
      { id: "list-wip", name: "Water WIP", cards: ["A1-053"], energyTypes: [] },
    ]);
    await page.goto("/decks");

    await test.step("Both saved decks appear with name, count, energy, and legality", async () => {
      const legal = summaryCard(page, "list-legal");
      await expect(legal.getByTestId("deck-summary-open")).toHaveText("Grass legal");
      await expect(legal.getByTestId("deck-summary-count")).toContainText("20 / 20");
      await expect(legal.getByTestId("deck-summary-legality")).toHaveAttribute(
        "data-legal",
        "true",
      );
      await expect(legal.getByTestId("deck-summary-energy")).toContainText("Grass");

      const wip = summaryCard(page, "list-wip");
      await expect(wip.getByTestId("deck-summary-open")).toHaveText("Water WIP");
      await expect(wip.getByTestId("deck-summary-count")).toContainText("1 / 20");
      await expect(wip.getByTestId("deck-summary-legality")).toHaveAttribute("data-legal", "false");
    });

    await test.step("The list still shows both decks after a full reload", async () => {
      await page.reload();

      await expect(summaryCard(page, "list-legal")).toBeVisible();
      await expect(summaryCard(page, "list-wip")).toBeVisible();
    });
  });

  test("opens a saved deck from the list into its editor", {
    tag: ["@scenario:decks.open.edit", "@area:decks", "@priority:must"],
  }, async ({ page }) => {
    await seedDecks(page, [
      { id: "open-me", name: "Water deck", cards: ["A1-053", "A1-053"], energyTypes: ["Water"] },
    ]);
    await page.goto("/decks");

    await summaryCard(page, "open-me").getByTestId("deck-summary-open").click();

    await expect(page).toHaveURL(/\/decks\/open-me\/edit$/);
    await expect(page.getByTestId("deck-name-input")).toHaveValue("Water deck");
  });

  test("deletes a deck through a named confirmation and it stays gone after reload", {
    tag: ["@scenario:decks.delete", "@area:decks", "@priority:must"],
  }, async ({ page }) => {
    await seedDecks(page, [
      { id: "keep-me", name: "Keep deck", cards: ["A1-053"], energyTypes: ["Water"] },
      { id: "delete-me", name: "Delete deck", cards: ["A1-033"], energyTypes: ["Fire"] },
    ]);
    await page.goto("/decks");

    await test.step("Declining the confirmation leaves the deck in the list", async () => {
      // Retry the first click so a pre-hydration press can't be dropped (the
      // delete dialog opens via client state); once it opens the rest is stable.
      const deleteButton = summaryCard(page, "delete-me").getByTestId("deck-summary-delete");
      await expect(async () => {
        await deleteButton.click();
        await expect(page.getByTestId("deck-delete-dialog")).toBeVisible({ timeout: 1500 });
      }).toPass({ timeout: 15000 });

      await expect(page.getByTestId("deck-delete-dialog")).toContainText("Delete deck");
      await page.getByTestId("deck-delete-cancel").click();

      await expect(page.getByTestId("deck-delete-dialog")).toHaveCount(0);
      await expect(summaryCard(page, "delete-me")).toBeVisible();
    });

    await test.step("Confirming the deletion removes the deck from the list", async () => {
      await summaryCard(page, "delete-me").getByTestId("deck-summary-delete").click();
      await expect(page.getByTestId("deck-delete-dialog")).toBeVisible();
      await page.getByTestId("deck-delete-confirm").click();

      await expect(summaryCard(page, "delete-me")).toHaveCount(0);
      await expect(summaryCard(page, "keep-me")).toBeVisible();
    });

    await test.step("The deleted deck stays gone after a full reload", async () => {
      await page.reload();

      await expect(summaryCard(page, "keep-me")).toBeVisible();
      await expect(summaryCard(page, "delete-me")).toHaveCount(0);
    });
  });

  test("shows an empty state with a working New deck action when nothing is saved", {
    tag: ["@scenario:decks.empty-state", "@area:decks", "@priority:should"],
  }, async ({ page }) => {
    await page.goto("/decks");

    await expect(page.getByTestId("decks-empty")).toBeVisible();

    await page.getByTestId("decks-new-link").click();

    await expect(page).toHaveURL(/\/decks\/new$/);
    await expect(page.getByTestId("deck-editor")).toBeVisible();
  });
});
