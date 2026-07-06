import { describe, expect, it } from "vitest";
import { getAllCards, getCard } from "./catalog";

describe("getAllCards()", () => {
  it("returns all 286 Genetic Apex cards, validated against the card schema", () => {
    const cards = getAllCards();

    expect(cards).toHaveLength(286);
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
