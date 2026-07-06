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

// Stand-in for the Genetic Apex registry row the fetcher passes in.
const geneticApex = { name: "Genetic Apex", nameJa: "最強の遺伝子" };
const SET_SIZE = 286;

describe("transformSourceCard()", () => {
  it("maps a Pokémon source record to the canonical card-data shape", () => {
    const card = transformSourceCard(bulbasaurSource, geneticApex, SET_SIZE);

    expect(card).toEqual({
      id: "A1-001",
      set: { code: "A1", name: "Genetic Apex", nameJa: "最強の遺伝子" },
      number: 1,
      setSize: 286,
      name: { en: "Bulbasaur", ja: null },
      rarity: { symbol: "◇", code: "C", label: "Common" },
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
    const card = transformSourceCard(helixFossilSource, geneticApex, SET_SIZE);

    expect(card).toMatchObject({
      id: "A1-216",
      category: "Trainer",
      pokemon: null,
      trainer: { subtype: "Item" },
      source: { provider: "dotgg.gg", slug: "a1-216-helix-fossil" },
    });
    expect(card.trainer.text).toContain("Basic {C} Pokémon");
  });

  it("takes the set name from the registry row, never the source record", () => {
    const card = transformSourceCard(
      bulbasaurSource,
      { name: "Renamed", nameJa: "改名" },
      SET_SIZE,
    );

    expect(card.set).toEqual({ code: "A1", name: "Renamed", nameJa: "改名" });
  });

  it('passes a Dragon\'s "none" weakness through verbatim for the schema to normalize', () => {
    const dragon = {
      ...bulbasaurSource,
      slug: "a1-183-dratini",
      number: 183,
      name: "Dratini",
      pokemon: { ...bulbasaurSource.pokemon, type: "Dragon", weakness: "none" },
    };

    expect(transformSourceCard(dragon, geneticApex, SET_SIZE).pokemon.weakness).toBe("none");
  });

  it("rejects a source record with an unexpected shape, naming the problem", () => {
    expect(() =>
      transformSourceCard({ slug: "x", setCode: "A1" }, geneticApex, SET_SIZE),
    ).toThrow();
  });
});

describe("validateCards()", () => {
  it("accepts the transformed fixture cards", () => {
    const cards = sourceCards.map((record) => transformSourceCard(record, geneticApex, SET_SIZE));

    const result = validateCards(cards);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a card that violates the schema and names its id and violation", () => {
    const valid = transformSourceCard(bulbasaurSource, geneticApex, SET_SIZE);
    const broken = { ...valid, id: "A1-1", pokemon: { ...valid.pokemon, hp: -5 } };

    const result = validateCards([valid, broken]);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].id).toBe("A1-1");
    expect(result.errors[0].violations.join(" ")).toContain("pokemon.hp");
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
    const cards = sourceCards.map((record) => transformSourceCard(record, geneticApex, SET_SIZE));

    expect(serializeCards(cards)).toBe(serializeCards(cards));
  });

  it("keeps primitive arrays inline and expands object arrays", () => {
    const cards = [transformSourceCard(bulbasaurSource, geneticApex, SET_SIZE)];
    const output = serializeCards(cards);

    expect(output).toContain('"cost": ["Grass", "Colorless"]');
    expect(output).toContain('"abilities": []');
    expect(output.endsWith("\n")).toBe(true);
  });

  it("sorts cards by number regardless of input order", () => {
    const cards = sourceCards
      .map((record) => transformSourceCard(record, geneticApex, SET_SIZE))
      .reverse();

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
