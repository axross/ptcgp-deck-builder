import { describe, expect, it } from "vitest";
import { getAllCards, getCard, getCardsBySet, getSeededSetCodes, getSetCardCount } from "./catalog";
import { getSet } from "./set-registry";

describe("getAllCards()", () => {
  it("returns the union of every seeded set, validated against the card schema", () => {
    const cards = getAllCards();

    // The catalog spans all seeded sets; assert the total equals the sum of the
    // registry counts for whichever sets are seeded (A1 today) rather than a
    // hard-coded literal, so seeding another set keeps this honest.
    const seededTotal = getSeededSetCodes().reduce(
      (sum, code) => sum + (getSet(code)?.cardCount ?? 0),
      0,
    );
    expect(cards).toHaveLength(seededTotal);
  });

  it("decodes a Pokémon card with its battle fields", () => {
    const bulbasaur = getCard("A1-001");

    expect(bulbasaur).toMatchObject({
      name: { en: "Bulbasaur" },
      category: "Pokemon",
      pokemon: {
        type: "Grass",
        hp: 70,
        stage: "Basic",
        weakness: "Fire",
        retreatCost: 1,
      },
    });
  });

  it("decodes a Trainer card with its subtype and rules text", () => {
    const trainers = getAllCards().filter((card) => card.category === "Trainer");

    expect(trainers).toHaveLength(19);
    for (const trainer of trainers) {
      expect(trainer.trainer.text.length).toBeGreaterThan(0);
    }
  });

  it('normalizes the source\'s "none" weakness on Dragon Pokémon to null', () => {
    const dratini = getCard("A1-183");

    expect(dratini?.category).toBe("Pokemon");
    expect(dratini?.pokemon?.weakness).toBeNull();
  });
});

describe("getCard()", () => {
  it("returns null for an unknown card id", () => {
    expect(getCard("A1-999")).toBeNull();
  });
});

describe("per-set access", () => {
  it("returns exactly a set's cards, matching the registry's card count", () => {
    const a1Count = getSet("A1")?.cardCount;

    expect(a1Count).toBeDefined();
    expect(getCardsBySet("A1")).toHaveLength(a1Count as number);
    expect(getSetCardCount("A1")).toBe(a1Count);
    expect(getCardsBySet("A1").every((card) => card.set.code === "A1")).toBe(true);
  });

  it("reports an unseeded set as empty without throwing", () => {
    expect(getCardsBySet("B3b")).toEqual([]);
    expect(getSetCardCount("B3b")).toBe(0);
  });

  it("lists the seeded set codes in registry order", () => {
    expect(getSeededSetCodes()).toEqual(["A1"]);
  });
});
