import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  serializeCards,
  setDataFilename,
  sortCardsByNumber,
  transformSourceCard,
  validateCards,
} from "./set-ingestion.mjs";

const sourceCards = JSON.parse(
  readFileSync(new URL("./fixtures/source-cards.json", import.meta.url), "utf8"),
);
const [bulbasaurSource, helixFossilSource] = sourceCards;

describe("transformSourceCard()", () => {
  it("maps a Pokémon source record to the canonical card-data shape", () => {
    const card = transformSourceCard(bulbasaurSource);

    expect(card).toEqual({
      id: "A1-001",
      setCode: "A1",
      number: 1,
      name: { en: "Bulbasaur", ja: null },
      rarity: "C",
      category: "Pokemon",
      pokemon: {
        type: "Grass",
        hp: 70,
        stage: "Basic",
        evolvesFrom: null,
        ruleBox: "None",
        isBaby: false,
        classification: null,
        weakness: "Fire",
        retreatCost: 1,
        abilities: [],
        attacks: [
          {
            name: { en: "Vine Whip", ja: null },
            cost: ["Grass", "Colorless"],
            damage: 40,
            damageSuffix: null,
            text: null,
          },
        ],
      },
      trainer: null,
      illustrator: "Narumi Sato",
      boosterPacks: null,
      flavorText: "There is a plant seed on its back right from the day this Pokémon is born.",
      shop: { packPoints: 35, dupeShinedust: 10 },
      source: { provider: "dotgg.gg", slug: "a1-1-bulbasaur" },
    });
  });

  it("maps a Trainer source record with its subtype and rules text", () => {
    const card = transformSourceCard(helixFossilSource);

    expect(card).toMatchObject({
      id: "A1-216",
      category: "Trainer",
      pokemon: null,
      trainer: { subtype: "Item" },
      source: { provider: "dotgg.gg", slug: "a1-216-helix-fossil" },
    });
    expect(card.trainer.text).toContain("Basic {C} Pokémon");
  });

  it("carries only the set-code reference, no embedded set metadata", () => {
    const card = transformSourceCard(bulbasaurSource);

    expect(card.setCode).toBe("A1");
    expect(card).not.toHaveProperty("set");
    expect(card).not.toHaveProperty("setSize");
  });

  it('passes a Dragon\'s "none" weakness through verbatim for the schema to normalize', () => {
    const dragon = {
      ...bulbasaurSource,
      slug: "a1-183-dratini",
      number: 183,
      name: "Dratini",
      pokemon: { ...bulbasaurSource.pokemon, type: "Dragon", weakness: "none" },
    };

    expect(transformSourceCard(dragon).pokemon.weakness).toBe("none");
  });

  it("rejects a source record with an unexpected shape, naming the problem", () => {
    expect(() => transformSourceCard({ slug: "x", setCode: "A1" })).toThrow();
  });
});

describe("validateCards()", () => {
  it("accepts the transformed fixture cards", () => {
    const cards = sourceCards.map((record) => transformSourceCard(record));

    const result = validateCards(cards);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a card that violates the schema and names its id and violation", () => {
    const valid = transformSourceCard(bulbasaurSource);
    const broken = { ...valid, id: "A1-1", pokemon: { ...valid.pokemon, hp: -5 } };

    const result = validateCards([valid, broken]);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].id).toBe("A1-1");
    expect(result.errors[0].violations.join(" ")).toContain("pokemon.hp");
  });

  it("rejects a rarity outside the code enum, naming the card", () => {
    // The unknown-tier trigger: the fetcher passes an unmapped source value
    // through verbatim, and the schema rejects it here by card id.
    const valid = transformSourceCard(bulbasaurSource);
    const unknownTier = { ...valid, rarity: "Sparkly Rare" };

    const result = validateCards([unknownTier]);

    expect(result.ok).toBe(false);
    expect(result.errors[0].id).toBe("A1-001");
    expect(result.errors[0].violations.join(" ")).toContain("rarity");
  });

  it("rejects a set code that does not resolve in the set registry", () => {
    const valid = transformSourceCard(bulbasaurSource);
    const unknownSet = { ...valid, setCode: "Z9" };

    const result = validateCards([unknownSet]);

    expect(result.ok).toBe(false);
    expect(result.errors[0].violations.join(" ")).toContain("setCode");
  });

  it("names a positional index when a failing record has no id", () => {
    const result = validateCards([{ not: "a card" }]);

    expect(result.ok).toBe(false);
    expect(result.errors[0].id).toBe("#0");
  });
});

describe("serializeCards()", () => {
  it("reproduces the checked-in A1 data file byte-for-byte", () => {
    const path = new URL("../src/features/cards/data/genetic-apex-a1.json", import.meta.url);
    const original = readFileSync(path, "utf8");

    expect(serializeCards(JSON.parse(original))).toBe(original);
  });

  it("is deterministic — the same cards always serialize identically", () => {
    const cards = sourceCards.map((record) => transformSourceCard(record));

    expect(serializeCards(cards)).toBe(serializeCards(cards));
  });

  it("keeps primitive arrays inline and expands object arrays", () => {
    const cards = [transformSourceCard(bulbasaurSource)];
    const output = serializeCards(cards);

    expect(output).toContain('"cost": ["Grass", "Colorless"]');
    expect(output).toContain('"abilities": []');
    expect(output.endsWith("\n")).toBe(true);
  });

  it("sorts cards by number regardless of input order", () => {
    const cards = sourceCards.map((record) => transformSourceCard(record)).reverse();

    expect(sortCardsByNumber(cards).map((card) => card.number)).toEqual([1, 216]);
  });
});

describe("setDataFilename()", () => {
  it("kebab-cases the set name and appends the lowercased code", () => {
    expect(setDataFilename("Genetic Apex", "A1")).toBe("genetic-apex-a1.json");
    expect(setDataFilename("Deluxe Pack: ex", "A4b")).toBe("deluxe-pack-ex-a4b.json");
    expect(setDataFilename("Space-Time Smackdown", "A2")).toBe("space-time-smackdown-a2.json");
  });
});
