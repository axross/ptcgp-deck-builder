import { describe, expect, it } from "vitest";
import {
  DECK_STORAGE_KEY,
  DECK_STORE_VERSION,
  loadDeck,
  loadDecks,
  saveDeck,
} from "./deck-storage";
import type { Deck } from "./schema";

function createFakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
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

describe("loadDecks()", () => {
  it("returns every saved deck in stored order", () => {
    const storage = createFakeStorage({ [DECK_STORAGE_KEY]: envelope([fireDeck, waterDeck]) });

    expect(loadDecks(storage)).toEqual([fireDeck, waterDeck]);
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadDecks(createFakeStorage())).toEqual([]);
  });

  it("treats a corrupt or unversioned envelope as empty rather than throwing", () => {
    const storage = createFakeStorage({
      [DECK_STORAGE_KEY]: JSON.stringify({ decks: [fireDeck] }),
    });

    expect(loadDecks(storage)).toEqual([]);
  });
});

describe("loadDeck()", () => {
  it("returns the deck matching the id", () => {
    const storage = createFakeStorage({ [DECK_STORAGE_KEY]: envelope([fireDeck, waterDeck]) });

    expect(loadDeck(storage, "deck-water")).toEqual(waterDeck);
  });

  it("returns null for an unknown id", () => {
    const storage = createFakeStorage({ [DECK_STORAGE_KEY]: envelope([fireDeck]) });

    expect(loadDeck(storage, "deck-missing")).toBeNull();
  });

  it("returns null when the stored data is corrupt", () => {
    const storage = createFakeStorage({ [DECK_STORAGE_KEY]: "{not json" });

    expect(loadDeck(storage, "deck-fire")).toBeNull();
  });
});

describe("saveDeck()", () => {
  it("appends a new deck and reports success", () => {
    const storage = createFakeStorage({ [DECK_STORAGE_KEY]: envelope([fireDeck]) });

    expect(saveDeck(storage, waterDeck)).toBe(true);
    expect(loadDecks(storage)).toEqual([fireDeck, waterDeck]);
  });

  it("replaces an existing deck matched by id without duplicating it", () => {
    const storage = createFakeStorage({ [DECK_STORAGE_KEY]: envelope([fireDeck, waterDeck]) });
    const renamed: Deck = { ...fireDeck, name: "Renamed fire" };

    expect(saveDeck(storage, renamed)).toBe(true);
    expect(loadDecks(storage)).toEqual([renamed, waterDeck]);
  });

  it("initializes the envelope when saving the first deck", () => {
    const storage = createFakeStorage();

    expect(saveDeck(storage, fireDeck)).toBe(true);
    expect(loadDecks(storage)).toEqual([fireDeck]);
  });

  it("returns false when the store rejects the write (e.g. quota exceeded)", () => {
    const rejectingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      },
    };

    expect(saveDeck(rejectingStorage, fireDeck)).toBe(false);
  });
});
