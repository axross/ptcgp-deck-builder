import { describe, expect, it } from "vitest";
import { getCard } from "@/features/cards/catalog";
import { toDeckBuilderCard } from "./deck-card";
import { DECK_STORAGE_KEY, DECK_STORE_VERSION } from "./deck-storage";
import { createDeckStore, deckDerived } from "./store";

// Real A1 cards so the store's copy-limit and rule interactions match the
// catalog the UI actually offers.
const BULBASAUR = "A1-001"; // Basic
const CATERPIE = "A1-005"; // Basic
const IVYSAUR = "A1-002"; // Stage 1, evolves from Bulbasaur

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

function setup(storage = createFakeStorage()) {
  let sequence = 0;
  return createDeckStore({
    catalog: projection(BULBASAUR, CATERPIE, IVYSAUR),
    getStorage: () => storage,
    generateId: () => {
      sequence += 1;
      return `deck-${sequence}`;
    },
  });
}

describe("deck editor store", () => {
  describe("addCard()", () => {
    it("adds copies and tracks the count by card name", () => {
      const store = setup();

      store.getState().addCard(BULBASAUR);
      store.getState().addCard(BULBASAUR);

      expect(store.getState().cardIds).toEqual([BULBASAUR, BULBASAUR]);
      expect(store.getState().copiesByName.Bulbasaur).toBe(2);
    });

    it("blocks a third copy of the same name", () => {
      const store = setup();

      store.getState().addCard(BULBASAUR);
      store.getState().addCard(BULBASAUR);
      store.getState().addCard(BULBASAUR);

      expect(store.getState().cardIds).toHaveLength(2);
      expect(store.getState().copiesByName.Bulbasaur).toBe(2);
    });

    it("ignores an id that is not in the catalog", () => {
      const store = setup();

      store.getState().addCard("A1-999");

      expect(store.getState().cardIds).toEqual([]);
    });
  });

  describe("removeCard()", () => {
    it("removes a single copy and keeps the rest", () => {
      const store = setup();
      store.getState().addCard(BULBASAUR);
      store.getState().addCard(BULBASAUR);

      store.getState().removeCard(BULBASAUR);

      expect(store.getState().cardIds).toEqual([BULBASAUR]);
      expect(store.getState().copiesByName.Bulbasaur).toBe(1);
    });
  });

  describe("toggleEnergyType()", () => {
    it("adds and removes a type", () => {
      const store = setup();

      store.getState().toggleEnergyType("Fire");
      expect(store.getState().energyTypes).toEqual(["Fire"]);

      store.getState().toggleEnergyType("Fire");
      expect(store.getState().energyTypes).toEqual([]);
    });

    it("caps registration at three types", () => {
      const store = setup();

      store.getState().toggleEnergyType("Fire");
      store.getState().toggleEnergyType("Water");
      store.getState().toggleEnergyType("Grass");
      store.getState().toggleEnergyType("Psychic");

      expect(store.getState().energyTypes).toEqual(["Fire", "Water", "Grass"]);
    });
  });

  describe("save()", () => {
    it("persists a new deck under the versioned envelope and reports success", () => {
      const storage = createFakeStorage();
      const store = setup(storage);
      store.getState().setName("My deck");
      store.getState().addCard(BULBASAUR);
      store.getState().toggleEnergyType("Grass");

      const result = store.getState().save();

      expect(result).toEqual({ ok: true, deckId: "deck-1", wasNew: true });
      expect(store.getState().saveResult.status).toBe("success");
      expect(JSON.parse(storage.snapshot()[DECK_STORAGE_KEY])).toEqual({
        version: DECK_STORE_VERSION,
        decks: [{ id: "deck-1", name: "My deck", cards: [BULBASAUR], energyTypes: ["Grass"] }],
      });
    });

    it("reuses the id and reports not-new on a second save", () => {
      const store = setup();
      store.getState().addCard(BULBASAUR);

      const first = store.getState().save();
      const second = store.getState().save();

      expect(first.wasNew).toBe(true);
      expect(second).toEqual({ ok: true, deckId: "deck-1", wasNew: false });
    });

    it("surfaces a visible error when the write is rejected and does not throw", () => {
      const rejectingStorage = {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("quota exceeded", "QuotaExceededError");
        },
      };
      const store = createDeckStore({
        catalog: projection(BULBASAUR),
        getStorage: () => rejectingStorage,
        generateId: () => "deck-x",
      });
      store.getState().addCard(BULBASAUR);

      const result = store.getState().save();

      expect(result.ok).toBe(false);
      expect(store.getState().saveResult.status).toBe("error");
    });
  });

  describe("loadExisting()", () => {
    it("hydrates the session from a saved deck", () => {
      const store = setup();

      store.getState().loadExisting({
        id: "deck-42",
        name: "Loaded",
        cards: [BULBASAUR, BULBASAUR],
        energyTypes: ["Grass"],
      });

      expect(store.getState().deckId).toBe("deck-42");
      expect(store.getState().name).toBe("Loaded");
      expect(store.getState().copiesByName.Bulbasaur).toBe(2);
    });
  });
});

describe("deckDerived()", () => {
  const catalog = projection(BULBASAUR, CATERPIE, IVYSAUR);

  it("reports the deck-size violation live via the domain rules", () => {
    const derived = deckDerived(
      { deckId: null, name: "", cardIds: [BULBASAUR], energyTypes: ["Grass"] },
      catalog,
    );

    expect(derived.count).toBe(1);
    expect(derived.isLegal).toBe(false);
    expect(derived.violations.some((v) => v.rule === "deck-size")).toBe(true);
  });

  it("groups the deck into one entry per distinct card in add order", () => {
    const derived = deckDerived(
      { deckId: null, name: "", cardIds: [BULBASAUR, CATERPIE, BULBASAUR], energyTypes: [] },
      catalog,
    );

    expect(derived.entries.map((entry) => [entry.card.id, entry.count])).toEqual([
      [BULBASAUR, 2],
      [CATERPIE, 1],
    ]);
  });

  it("surfaces advice from the domain layer (missing evolution base)", () => {
    const derived = deckDerived(
      { deckId: null, name: "", cardIds: [IVYSAUR], energyTypes: ["Grass"] },
      catalog,
    );

    expect(derived.advice.some((a) => a.advice === "missing-evolution-base")).toBe(true);
  });
});
