import type { Card } from "@/features/cards/schema";
import type { Deck } from "./schema";

/**
 * Non-blocking deck-building advice, distinct from the legality rules in
 * deck-rules.ts: a deck with warnings is still legal to save and play.
 *
 * Deliberately NOT advised on: registered Energy Zone types vs. attack
 * costs — a deck's energy registration is a strategic choice with no
 * "correct" mapping (product decision; see ptcgp-domain › Product Decisions).
 */

export const RECOMMENDED_MIN_BASICS = 5;

export type DeckAdvice =
  | { advice: "few-basic-pokemon"; message: string; basicCount: number }
  | { advice: "missing-evolution-base"; message: string; cardName: string; evolvesFrom: string };

/**
 * Returns advisory warnings for a deck. Unknown card ids are ignored here —
 * deck-rules.ts reports them as violations.
 */
export function adviseDeck(deck: Deck, getCard: (id: string) => Card | null): DeckAdvice[] {
  const advice: DeckAdvice[] = [];

  const cards = deck.cards.map(getCard).filter((card): card is Card => card !== null);
  const pokemon = cards.filter((card) => card.category === "Pokemon");

  const basicCount = pokemon.filter((card) => card.pokemon.stage === "Basic").length;
  if (basicCount < RECOMMENDED_MIN_BASICS) {
    advice.push({
      advice: "few-basic-pokemon",
      message: `Decks run best with ${RECOMMENDED_MIN_BASICS}–6 Basic Pokémon; this one has ${basicCount}. If your only Pokémon in play is Knocked Out with no replacement, you lose instantly.`,
      basicCount,
    });
  }

  // An evolution card is only playable when its lower stage is also in the
  // deck (evolvesFrom names a card name, and fossils cover the fossil lines).
  const namesInDeck = new Set(cards.map((card) => card.name.en));
  const reportedEvolutions = new Set<string>();
  for (const card of pokemon) {
    const evolvesFrom = card.pokemon.evolvesFrom;
    if (
      evolvesFrom === null ||
      namesInDeck.has(evolvesFrom) ||
      reportedEvolutions.has(card.name.en)
    ) {
      continue;
    }
    reportedEvolutions.add(card.name.en);
    advice.push({
      advice: "missing-evolution-base",
      message: `"${card.name.en}" evolves from "${evolvesFrom}", which is not in this deck, so it can never be played.`,
      cardName: card.name.en,
      evolvesFrom,
    });
  }

  return advice;
}
