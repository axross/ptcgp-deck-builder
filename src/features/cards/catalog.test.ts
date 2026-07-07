import { describe, expect, it } from "vitest";
import { getAllCards, getCard, getCardsBySet, getSeededSetCodes, getSetCardCount } from "./catalog";
import { getSet, setCodes } from "./set-registry";

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

  it("decodes Trainer cards with their subtype and rules text", () => {
    const trainers = getAllCards().filter((card) => card.category === "Trainer");

    expect(trainers.length).toBeGreaterThan(0);
    for (const trainer of trainers) {
      expect(trainer.trainer.subtype.length).toBeGreaterThan(0);
      expect(trainer.trainer.text.length).toBeGreaterThan(0);
    }
    // Spot-check a known fossil, which the source models as an Item.
    expect(getCard("A1-216")).toMatchObject({
      category: "Trainer",
      trainer: { subtype: "Item" },
    });
  });

  it('normalizes the source\'s "none" weakness on Dragon Pokémon to null', () => {
    const dratini = getCard("A1-183");

    expect(dratini?.category).toBe("Pokemon");
    expect(dratini?.pokemon?.weakness).toBeNull();
  });

  it("decodes a B1 MegaEx card with its evolves-from chain", () => {
    // Mega Rising (B1) debuts the MegaEx rule box. A Mega evolves from its real
    // prior stage — Combusken → Mega Blaziken ex — skipping the plain Stage 2.
    expect(getCard("B1-036")).toMatchObject({
      name: { en: "Mega Blaziken ex" },
      category: "Pokemon",
      pokemon: {
        ruleBox: "MegaEx",
        stage: "Stage2",
        evolvesFrom: "Combusken",
      },
    });
  });

  it("decodes a Basic MegaEx card, which has no evolves-from stage", () => {
    // Some Megas are Basics (no lower stage), e.g. Mega Pinsir ex.
    expect(getCard("B1-002")).toMatchObject({
      name: { en: "Mega Pinsir ex" },
      pokemon: { ruleBox: "MegaEx", stage: "Basic", evolvesFrom: null },
    });
  });

  it("decodes the B1 Shiny rarity tiers introduced by Mega Rising", () => {
    // B1 is the first seeded set to carry the Shiny (✸) / Shiny Super Rare (✸✸)
    // tiers, added to the rarity enum when the fetch surfaced them.
    expect(getCard("B1-287")?.rarity).toMatchObject({ code: "S", label: "Shiny" });
    expect(getCard("B1-317")?.rarity).toMatchObject({
      code: "SSR",
      label: "Shiny Super Rare",
    });
  });
});

describe("getCard()", () => {
  it("returns null for an unknown card id", () => {
    expect(getCard("A1-999")).toBeNull();
  });
});

describe("first-of-kind mechanics across the seeded sets", () => {
  it("types a Pokémon Tool trainer subtype (first seen in A2)", () => {
    expect(getCard("A2-147")).toMatchObject({
      category: "Trainer",
      trainer: { subtype: "PokemonTool" },
    });
  });

  it("carries the Shiny rarity tiers introduced in A2b", () => {
    expect(getCard("A2b-097")?.rarity).toMatchObject({ symbol: "✸", code: "S", label: "Shiny" });
    expect(getCard("A2b-107")?.rarity).toMatchObject({
      symbol: "✸✸",
      code: "SSR",
      label: "Shiny Super Rare",
    });
  });

  it("classifies an Ultra Beast, first seen in A3a", () => {
    const nihilego = getCard("A3a-042");

    expect(nihilego?.category).toBe("Pokemon");
    expect(nihilego?.pokemon?.classification).toBe("UltraBeast");
  });

  it("leaves isBaby false everywhere — no source marks Baby Pokémon", () => {
    const pokemon = getAllCards().filter((card) => card.category === "Pokemon");

    expect(pokemon.length).toBeGreaterThan(0);
    expect(pokemon.every((card) => card.pokemon.isBaby === false)).toBe(true);
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
    const seeded = getSeededSetCodes();

    // Stays honest as more sets are seeded: the codes are exactly the seeded
    // ones, ordered as they appear in the registry's chronological list.
    expect(seeded).toEqual(setCodes.filter((code) => seeded.includes(code)));
    expect(seeded).toContain("A1");
  });
});
