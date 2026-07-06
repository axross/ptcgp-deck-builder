import { describe, expect, it } from "vitest";
import { getCard } from "@/features/cards/catalog";
import type { Card } from "@/features/cards/schema";
import { validateDeck } from "./deck-rules";
import type { Deck } from "./schema";

function makePokemonCard(overrides: {
  id: string;
  name: string;
  stage?: "Basic" | "Stage1" | "Stage2";
}): Card {
  return {
    id: overrides.id,
    set: { code: "T1", name: "Test Set", nameJa: null },
    number: 1,
    setSize: 10,
    name: { en: overrides.name, ja: null },
    rarity: { symbol: "◇", code: "C", label: "Common" },
    category: "Pokemon",
    pokemon: {
      type: "Grass",
      hp: 60,
      stage: overrides.stage ?? "Basic",
      evolvesFrom: null,
      ruleBox: "None",
      isBaby: false,
      classification: null,
      weakness: "Fire",
      retreatCost: 1,
      abilities: [],
      attacks: [],
    },
    trainer: null,
    illustrator: null,
    boosterPacks: null,
    flavorText: null,
    shop: { packPoints: 35, dupeShinedust: 10 },
    source: { provider: "test", slug: overrides.id },
  };
}

// A fake catalog of 20 distinct Basic Pokémon, T1-001 … T1-020.
const fakeCards = new Map<string, Card>(
  Array.from({ length: 20 }, (_, i) => {
    const id = `T1-${String(i + 1).padStart(3, "0")}`;
    return [id, makePokemonCard({ id, name: `Testmon ${i + 1}` })] as const;
  }),
);
const getFakeCard = (id: string) => fakeCards.get(id) ?? null;

function makeLegalDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "deck-1",
    name: "Test deck",
    cards: [...fakeCards.keys()],
    energyTypes: ["Grass"],
    ...overrides,
  };
}

describe("validateDeck()", () => {
  it("returns no violations for a legal deck", () => {
    expect(validateDeck(makeLegalDeck(), getFakeCard)).toEqual([]);
  });

  it("flags a deck that does not have exactly 20 cards", () => {
    const deck = makeLegalDeck({ cards: [...fakeCards.keys()].slice(0, 19) });

    const violations = validateDeck(deck, getFakeCard);

    expect(violations).toContainEqual(
      expect.objectContaining({ rule: "deck-size", cardCount: 19 }),
    );
  });

  it("flags more than 2 copies of the same card name, counting art variants together", () => {
    // T1-021 is an art variant sharing the name "Testmon 1", so with the
    // regular T1-001 twice the deck holds 3 copies of one name.
    const variant = makePokemonCard({ id: "T1-021", name: "Testmon 1" });
    const withVariant = (id: string) => (id === "T1-021" ? variant : getFakeCard(id));
    const deck = makeLegalDeck({
      cards: [...[...fakeCards.keys()].slice(0, 18), "T1-001", "T1-021"],
    });

    const violations = validateDeck(deck, withVariant);

    expect(violations).toContainEqual(
      expect.objectContaining({ rule: "copy-limit", cardName: "Testmon 1", copies: 3 }),
    );
  });

  it("allows exactly 2 copies of the same card name", () => {
    const deck = makeLegalDeck({
      cards: [...[...fakeCards.keys()].slice(0, 19), "T1-001"],
    });

    expect(validateDeck(deck, getFakeCard)).toEqual([]);
  });

  it("flags a deck with no Basic Pokémon", () => {
    const stage1 = makePokemonCard({ id: "T1-030", name: "Evolvedmon", stage: "Stage1" });
    const onlyStage1 = () => stage1;
    const deck = makeLegalDeck({
      cards: Array.from({ length: 20 }, (_, i) => `T1-${String(100 + i)}`),
    });

    const violations = validateDeck(deck, onlyStage1);

    // Every entry resolves to the same Stage 1 card, so the copy limit also fires.
    expect(violations).toContainEqual(expect.objectContaining({ rule: "no-basic-pokemon" }));
  });

  it("flags unknown card ids once per id", () => {
    const deck = makeLegalDeck({
      cards: [...[...fakeCards.keys()].slice(0, 18), "T1-999", "T1-999"],
    });

    const violations = validateDeck(deck, getFakeCard);

    expect(violations.filter((v) => v.rule === "unknown-card")).toEqual([
      expect.objectContaining({ rule: "unknown-card", cardId: "T1-999" }),
    ]);
  });

  it("flags registering zero or more than three Energy Zone types", () => {
    expect(validateDeck(makeLegalDeck({ energyTypes: [] }), getFakeCard)).toContainEqual(
      expect.objectContaining({ rule: "energy-type-count", energyTypeCount: 0 }),
    );
    expect(
      validateDeck(
        makeLegalDeck({ energyTypes: ["Grass", "Fire", "Water", "Lightning"] }),
        getFakeCard,
      ),
    ).toContainEqual(expect.objectContaining({ rule: "energy-type-count", energyTypeCount: 4 }));
  });

  it("accepts a legal deck built from the real Genetic Apex catalog", () => {
    // 2× the Charmander/Growlithe/Ponyta lines plus Magmar, Moltres, and
    // three Supporters — 20 real Fire-deck cards.
    const deck: Deck = {
      id: "deck-a1",
      name: "Charizard",
      cards: [
        "A1-033", // Charmander (Basic)
        "A1-033",
        "A1-034", // Charmeleon (Stage 1)
        "A1-034",
        "A1-035", // Charizard (Stage 2)
        "A1-035",
        "A1-039", // Growlithe (Basic)
        "A1-039",
        "A1-040", // Arcanine (Stage 1)
        "A1-040",
        "A1-042", // Ponyta (Basic)
        "A1-042",
        "A1-043", // Rapidash (Stage 1)
        "A1-043",
        "A1-044", // Magmar (Basic)
        "A1-044",
        "A1-046", // Moltres (Basic)
        "A1-221", // Blaine (Supporter)
        "A1-223", // Giovanni (Supporter)
        "A1-219", // Erika (Supporter)
      ],
      energyTypes: ["Fire"],
    };

    expect(validateDeck(deck, getCard)).toEqual([]);
  });
});
