import { describe, expect, it } from "vitest";
import { getCard } from "@/features/cards/catalog";
import { toDeckBuilderCard } from "./deck-card";
import { createDeckListStore, summarizeDeck } from "./deck-list-store";
import { DECK_STORAGE_KEY, DECK_STORE_VERSION } from "./deck-storage";
import type { Deck } from "./schema";

// Real A1 cards so summarized legality matches the catalog the UI offers.
const BULBASAUR = "A1-001"; // Basic
const IVYSAUR = "A1-002"; // Stage 1, evolves from Bulbasaur

// Ten distinct-name A1 Basics; two of each is a legal 20-card deck (all Basic
// satisfies "at least one Basic", ≤2 per name).
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

function projection(...ids: string[]) {
  return new Map(
    ids.map((id) => {
      const card = getCard(id);
      if (card === null) {
        throw new Error(`test setup: unknown card ${id}`);
      }
      return [id, toDeckBuilderCard(card)];
    }),
  );
}

function createFakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    snapshot: () => Object.fromEntries(data),
  };
}

function envelope(decks: Deck[]): string {
  return JSON.stringify({ version: DECK_STORE_VERSION, decks });
}

const fireDeck: Deck = {
  id: "deck-fire",
  name: "Fire starter",
  cards: ["A1-033", "A1-033"],
  energyTypes: ["Fire"],
};

const waterDeck: Deck = {
  id: "deck-water",
  name: "Water splash",
  cards: ["A1-053"],
  energyTypes: ["Water"],
};

describe("deck list store", () => {
  describe("load()", () => {
    it("reads every saved deck in stored order and marks the list loaded", () => {
      const storage = createFakeStorage({ [DECK_STORAGE_KEY]: envelope([fireDeck, waterDeck]) });
      const store = createDeckListStore({ getStorage: () => storage });

      store.getState().load();

      expect(store.getState().decks).toEqual([fireDeck, waterDeck]);
      expect(store.getState().loaded).toBe(true);
    });

    it("treats absent storage as an empty list without throwing", () => {
      const store = createDeckListStore({ getStorage: () => createFakeStorage() });

      store.getState().load();

      expect(store.getState().decks).toEqual([]);
      expect(store.getState().loaded).toBe(true);
    });

    it("treats corrupt storage as an empty list", () => {
      const storage = createFakeStorage({ [DECK_STORAGE_KEY]: "{not json" });
      const store = createDeckListStore({ getStorage: () => storage });

      store.getState().load();

      expect(store.getState().decks).toEqual([]);
    });
  });

  describe("deleteDeck()", () => {
    it("removes the deck from storage and the in-memory list", () => {
      const storage = createFakeStorage({ [DECK_STORAGE_KEY]: envelope([fireDeck, waterDeck]) });
      const store = createDeckListStore({ getStorage: () => storage });
      store.getState().load();

      const ok = store.getState().deleteDeck("deck-fire");

      expect(ok).toBe(true);
      expect(store.getState().decks).toEqual([waterDeck]);
      expect(JSON.parse(storage.snapshot()[DECK_STORAGE_KEY])).toEqual({
        version: DECK_STORE_VERSION,
        decks: [waterDeck],
      });
      expect(store.getState().deleteResult.status).toBe("idle");
    });

    it("surfaces an error and leaves the in-memory list intact when the write is rejected", () => {
      const rejectingStorage = {
        getItem: () => envelope([fireDeck, waterDeck]),
        setItem: () => {
          throw new DOMException("quota exceeded", "QuotaExceededError");
        },
      };
      const store = createDeckListStore({ getStorage: () => rejectingStorage });
      store.getState().load();

      const ok = store.getState().deleteDeck("deck-fire");

      expect(ok).toBe(false);
      expect(store.getState().decks).toEqual([fireDeck, waterDeck]);
      expect(store.getState().deleteResult.status).toBe("error");
    });
  });
});

describe("summarizeDeck()", () => {
  it("reports the card count and registered energy from the saved deck", () => {
    const summary = summarizeDeck(
      { id: "d", name: "n", cards: [BULBASAUR, BULBASAUR], energyTypes: ["Grass"] },
      projection(BULBASAUR),
    );

    expect(summary.cardCount).toBe(2);
    expect(summary.energyTypes).toEqual(["Grass"]);
  });

  it("marks an incomplete deck illegal via the domain rules", () => {
    const summary = summarizeDeck(
      { id: "d", name: "n", cards: [BULBASAUR], energyTypes: ["Grass"] },
      projection(BULBASAUR),
    );

    expect(summary.isLegal).toBe(false);
  });

  it("marks a rule-valid 20-card deck legal", () => {
    const summary = summarizeDeck(
      {
        id: "d",
        name: "n",
        cards: BASIC_IDS.flatMap((id) => [id, id]),
        energyTypes: ["Grass"],
      },
      projection(...BASIC_IDS),
    );

    expect(summary.cardCount).toBe(20);
    expect(summary.isLegal).toBe(true);
  });

  it("treats an unknown card id as a violation, keeping the deck illegal", () => {
    const summary = summarizeDeck(
      { id: "d", name: "n", cards: ["A1-999"], energyTypes: ["Grass"] },
      projection(BULBASAUR, IVYSAUR),
    );

    expect(summary.isLegal).toBe(false);
  });
});
