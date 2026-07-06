import { describe, expect, it } from "vitest";
import { getCard } from "@/features/cards/catalog";
import { toDeckBuilderCard } from "./deck-card";
import { filterPickerCards, matchesPickerCriteria } from "./deck-card-search";

function projection(...ids: string[]) {
  return ids.map((id) => {
    const card = getCard(id);
    if (card === null) {
      throw new Error(`test setup: unknown card ${id}`);
    }
    return toDeckBuilderCard(card);
  });
}

const BULBASAUR = "A1-001"; // Grass, Basic
const IVYSAUR = "A1-002"; // Grass, Stage 1
const CHARMANDER = "A1-033"; // Fire, Basic
const ERIKA = "A1-219"; // Trainer (Supporter)

describe("matchesPickerCriteria()", () => {
  const [bulbasaur] = projection(BULBASAUR);

  it("matches by energy type", () => {
    expect(matchesPickerCriteria(bulbasaur, { type: "Grass" })).toBe(true);
    expect(matchesPickerCriteria(bulbasaur, { type: "Fire" })).toBe(false);
  });

  it("matches by kind, treating Trainer as a category", () => {
    const [erika] = projection(ERIKA);

    expect(matchesPickerCriteria(bulbasaur, { kind: "Basic" })).toBe(true);
    expect(matchesPickerCriteria(bulbasaur, { kind: "Trainer" })).toBe(false);
    expect(matchesPickerCriteria(erika, { kind: "Trainer" })).toBe(true);
    expect(matchesPickerCriteria(erika, { kind: "Basic" })).toBe(false);
  });

  it("matches names case-insensitively by substring", () => {
    expect(matchesPickerCriteria(bulbasaur, { query: "BULB" })).toBe(true);
    expect(matchesPickerCriteria(bulbasaur, { query: "char" })).toBe(false);
  });

  it("intersects present constraints", () => {
    const [charmander] = projection(CHARMANDER);

    expect(matchesPickerCriteria(charmander, { type: "Fire", kind: "Basic" })).toBe(true);
    expect(matchesPickerCriteria(charmander, { type: "Fire", kind: "Stage1" })).toBe(false);
  });
});

describe("filterPickerCards()", () => {
  it("keeps only matching cards in original order", () => {
    const cards = projection(BULBASAUR, IVYSAUR, CHARMANDER, ERIKA);

    const grassBasics = filterPickerCards(cards, { type: "Grass", kind: "Basic" });

    expect(grassBasics.map((card) => card.id)).toEqual([BULBASAUR]);
  });
});
