import { describe, expect, it } from "vitest";
import { getCard } from "@/features/cards/catalog";
import { adviseDeck } from "./deck-advice";
import type { Deck } from "./schema";

function makeDeck(cards: string[]): Deck {
  return { id: "deck-1", name: "Test deck", cards, energyTypes: ["Fire"] };
}

// Real A1 ids: Charmander line, Growlithe/Arcanine, Ponyta/Rapidash, Magmar,
// Moltres, and Supporters (Blaine/Giovanni/Erika).
const CHARMANDER = "A1-033";
const CHARMELEON = "A1-034";
const CHARIZARD = "A1-035";
const GROWLITHE = "A1-039";
const ARCANINE = "A1-040";
const PONYTA = "A1-042";
const RAPIDASH = "A1-043";
const MAGMAR = "A1-044";
const MOLTRES = "A1-046";
const BLAINE = "A1-221";
const GIOVANNI = "A1-223";
const ERIKA = "A1-219";

const WELL_BUILT_DECK = [
  CHARMANDER,
  CHARMANDER,
  CHARMELEON,
  CHARMELEON,
  CHARIZARD,
  CHARIZARD,
  GROWLITHE,
  GROWLITHE,
  ARCANINE,
  ARCANINE,
  PONYTA,
  PONYTA,
  RAPIDASH,
  RAPIDASH,
  MAGMAR,
  MAGMAR,
  MOLTRES,
  BLAINE,
  GIOVANNI,
  ERIKA,
];

describe("adviseDeck()", () => {
  it("returns no advice for a well-built deck", () => {
    expect(adviseDeck(makeDeck(WELL_BUILT_DECK), getCard)).toEqual([]);
  });

  it("recommends more Basic Pokémon when the deck has fewer than 5", () => {
    // 2× the full Charmander line + Supporters: only 2 Basics.
    const deck = makeDeck([
      CHARMANDER,
      CHARMANDER,
      CHARMELEON,
      CHARMELEON,
      CHARIZARD,
      CHARIZARD,
      BLAINE,
      BLAINE,
      GIOVANNI,
      GIOVANNI,
      ERIKA,
      ERIKA,
    ]);

    expect(adviseDeck(deck, getCard)).toContainEqual(
      expect.objectContaining({ advice: "few-basic-pokemon", basicCount: 2 }),
    );
  });

  it("flags an evolution card whose lower stage is missing, once per card name", () => {
    // Charizard ×2 without Charmeleon: unplayable evolutions.
    const deck = makeDeck([
      CHARIZARD,
      CHARIZARD,
      GROWLITHE,
      GROWLITHE,
      PONYTA,
      PONYTA,
      MAGMAR,
      MAGMAR,
      MOLTRES,
      CHARMANDER,
    ]);

    const advice = adviseDeck(deck, getCard);

    expect(advice.filter((a) => a.advice === "missing-evolution-base")).toEqual([
      expect.objectContaining({
        advice: "missing-evolution-base",
        cardName: "Charizard",
        evolvesFrom: "Charmeleon",
      }),
    ]);
  });

  it("does not warn about energy registration regardless of attack costs", () => {
    // A Fire-line deck registering only Water energy is a legitimate strategy.
    const deck: Deck = {
      ...makeDeck(WELL_BUILT_DECK),
      energyTypes: ["Water"],
    };

    expect(adviseDeck(deck, getCard)).toEqual([]);
  });
});
