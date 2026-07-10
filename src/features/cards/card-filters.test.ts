import { describe, expect, it } from "vitest";
import {
  type CardFilterCriteria,
  filterCards,
  hasActiveFilters,
  matchesCardFilters,
  parseCardFilters,
} from "./card-filters";
import { getCard } from "./catalog";
import type { Card } from "./schema";

function fixture(id: string): Card {
  const card = getCard(id);
  if (card === null) {
    throw new Error(`Test fixture card "${id}" is missing from the catalog.`);
  }
  return card;
}

// Stable fixtures from the A1 dataset (see catalog.test.ts for the counts).
const bulbasaur = fixture("A1-001"); // Grass, Basic, Common
const ivysaur = fixture("A1-002"); // Grass, Stage1, Uncommon
const venusaur = fixture("A1-003"); // Grass, Stage2, Rare
const charmander = fixture("A1-033"); // Fire, Basic, Common
const helixFossil = fixture("A1-216"); // Trainer, Item
const erika = fixture("A1-219"); // Trainer, Supporter, Uncommon

const sample = [bulbasaur, ivysaur, venusaur, charmander, helixFossil, erika];

// A synthetic card from a second set — the catalog only seeds A1, so cross-set
// filtering is proved here by cloning an A1 card into a B1 identity.
const megaVenusaur: Card = {
  ...venusaur,
  id: "B1-001",
  setCode: "B1",
};

function ids(cards: readonly Card[]): string[] {
  return cards.map((card) => card.id);
}

describe("matchesCardFilters()", () => {
  it("matches everything when the criteria is empty", () => {
    for (const card of sample) {
      expect(matchesCardFilters(card, {})).toBe(true);
    }
  });

  it("matches a Pokémon of the selected type and excludes other types", () => {
    expect(matchesCardFilters(charmander, { type: "Fire" })).toBe(true);
    expect(matchesCardFilters(bulbasaur, { type: "Fire" })).toBe(false);
  });

  it("never matches a Trainer against a type filter", () => {
    expect(matchesCardFilters(erika, { type: "Fire" })).toBe(false);
    expect(matchesCardFilters(helixFossil, { type: "Colorless" })).toBe(false);
  });

  it("matches by rarity code", () => {
    expect(matchesCardFilters(bulbasaur, { rarity: "C" })).toBe(true);
    expect(matchesCardFilters(ivysaur, { rarity: "C" })).toBe(false);
  });

  it("matches a Pokémon kind by its stage", () => {
    expect(matchesCardFilters(bulbasaur, { kind: "Basic" })).toBe(true);
    expect(matchesCardFilters(ivysaur, { kind: "Stage1" })).toBe(true);
    expect(matchesCardFilters(venusaur, { kind: "Stage2" })).toBe(true);
    expect(matchesCardFilters(bulbasaur, { kind: "Stage2" })).toBe(false);
  });

  it("matches a Trainer kind by its subtype", () => {
    expect(matchesCardFilters(erika, { kind: "Supporter" })).toBe(true);
    expect(matchesCardFilters(helixFossil, { kind: "Item" })).toBe(true);
    expect(matchesCardFilters(erika, { kind: "Item" })).toBe(false);
    expect(matchesCardFilters(bulbasaur, { kind: "Supporter" })).toBe(false);
  });

  it("matches by set code and excludes other sets", () => {
    expect(matchesCardFilters(bulbasaur, { set: "A1" })).toBe(true);
    expect(matchesCardFilters(megaVenusaur, { set: "A1" })).toBe(false);
    expect(matchesCardFilters(megaVenusaur, { set: "B1" })).toBe(true);
  });

  it("matches the name search case-insensitively on a substring", () => {
    expect(matchesCardFilters(bulbasaur, { query: "bulba" })).toBe(true);
    expect(matchesCardFilters(bulbasaur, { query: "SAUR" })).toBe(true);
    expect(matchesCardFilters(charmander, { query: "bulba" })).toBe(false);
  });

  it("ignores a blank or whitespace-only query", () => {
    expect(matchesCardFilters(charmander, { query: "   " })).toBe(true);
  });

  it("intersects multiple constraints (logical AND)", () => {
    const criteria: CardFilterCriteria = { type: "Grass", kind: "Stage2" };
    expect(matchesCardFilters(venusaur, criteria)).toBe(true);
    expect(matchesCardFilters(bulbasaur, criteria)).toBe(false); // Grass but Basic
  });
});

describe("filterCards()", () => {
  it("returns every card in order when unfiltered", () => {
    expect(ids(filterCards(sample, {}))).toEqual(ids(sample));
  });

  it("narrows to the matching Grass cards", () => {
    expect(ids(filterCards(sample, { type: "Grass" }))).toEqual(["A1-001", "A1-002", "A1-003"]);
  });

  it("intersects a type and a kind filter", () => {
    expect(ids(filterCards(sample, { type: "Grass", kind: "Basic" }))).toEqual(["A1-001"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterCards(sample, { type: "Fire", kind: "Stage2" })).toEqual([]);
  });

  it("narrows a multi-set list to a single set", () => {
    const mixed = [bulbasaur, megaVenusaur, charmander];
    expect(ids(filterCards(mixed, { set: "B1" }))).toEqual(["B1-001"]);
    expect(ids(filterCards(mixed, { set: "A1" }))).toEqual(["A1-001", "A1-033"]);
  });
});

describe("hasActiveFilters()", () => {
  it("is false for an empty criteria and a blank query", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ query: "  " })).toBe(false);
  });

  it("is true when any constraint is set", () => {
    expect(hasActiveFilters({ type: "Fire" })).toBe(true);
    expect(hasActiveFilters({ rarity: "C" })).toBe(true);
    expect(hasActiveFilters({ kind: "Supporter" })).toBe(true);
    expect(hasActiveFilters({ set: "A1" })).toBe(true);
    expect(hasActiveFilters({ query: "pika" })).toBe(true);
  });
});

describe("parseCardFilters()", () => {
  const options = { rarityCodes: ["C", "U", "R"], setCodes: ["A1", "B1"] };

  it("parses a full set of valid params", () => {
    expect(
      parseCardFilters(
        { type: "Fire", rarity: "R", kind: "Stage2", set: "B1", q: "char" },
        options,
      ),
    ).toEqual({ type: "Fire", rarity: "R", kind: "Stage2", set: "B1", query: "char" });
  });

  it("drops unknown or malformed values instead of throwing", () => {
    expect(
      parseCardFilters(
        { type: "Plasma", rarity: "ZZ", kind: "Mega", set: "Z9", q: "   " },
        options,
      ),
    ).toEqual({});
  });

  it("parses a Trainer-subtype kind", () => {
    expect(parseCardFilters({ kind: "Supporter" }, options)).toEqual({ kind: "Supporter" });
  });

  it("drops the pre-split Trainer kind value from an old bookmark", () => {
    expect(parseCardFilters({ kind: "Trainer" }, options)).toEqual({});
  });

  it("drops a rarity not present in the catalog", () => {
    expect(parseCardFilters({ rarity: "SAR" }, options)).toEqual({});
  });

  it("drops a set that is not seeded in the catalog", () => {
    expect(parseCardFilters({ set: "A2" }, options)).toEqual({});
  });

  it("coerces a repeated (array) param to its first value", () => {
    expect(parseCardFilters({ type: ["Water", "Fire"] }, options)).toEqual({ type: "Water" });
  });

  it("returns an empty criteria for no params", () => {
    expect(parseCardFilters({}, options)).toEqual({});
  });
});
