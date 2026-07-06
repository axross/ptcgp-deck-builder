import type { Card } from "@/features/cards/schema";
import type { Deck } from "./schema";

/**
 * PTCGP deck-construction rules, per the ptcgp-domain skill
 * (.claude/skills/ptcgp-domain/references/game-rule.md §1).
 */

export const DECK_SIZE = 20;
export const MAX_COPIES_PER_NAME = 2;
export const MIN_ENERGY_TYPES = 1;
export const MAX_ENERGY_TYPES = 3;

export type DeckRuleViolation =
  | { rule: "deck-size"; message: string; cardCount: number }
  | { rule: "unknown-card"; message: string; cardId: string }
  | { rule: "copy-limit"; message: string; cardName: string; copies: number }
  | { rule: "no-basic-pokemon"; message: string }
  | { rule: "energy-type-count"; message: string; energyTypeCount: number };

/**
 * Validates a deck against the construction rules and returns every
 * violation (an empty array means the deck is legal):
 *
 * - exactly {@link DECK_SIZE} cards;
 * - at most {@link MAX_COPIES_PER_NAME} copies per card *name* — the limit
 *   spans art/rarity variants, which share a name;
 * - at least one Basic Pokémon (Fossil Items act as Basics in play but do
 *   not satisfy this rule — they cannot be placed during setup);
 * - between {@link MIN_ENERGY_TYPES} and {@link MAX_ENERGY_TYPES} registered
 *   Energy Zone types.
 */
export function validateDeck(
  deck: Deck,
  getCard: (id: string) => Card | null,
): DeckRuleViolation[] {
  const violations: DeckRuleViolation[] = [];

  if (deck.cards.length !== DECK_SIZE) {
    violations.push({
      rule: "deck-size",
      message: `A deck must contain exactly ${DECK_SIZE} cards; this one has ${deck.cards.length}.`,
      cardCount: deck.cards.length,
    });
  }

  const copiesByName = new Map<string, number>();
  const reportedUnknownIds = new Set<string>();
  let hasBasicPokemon = false;
  for (const cardId of deck.cards) {
    const card = getCard(cardId);
    if (card === null) {
      if (!reportedUnknownIds.has(cardId)) {
        reportedUnknownIds.add(cardId);
        violations.push({
          rule: "unknown-card",
          message: `Card "${cardId}" is not in the catalog.`,
          cardId,
        });
      }
      continue;
    }
    copiesByName.set(card.name.en, (copiesByName.get(card.name.en) ?? 0) + 1);
    if (card.category === "Pokemon" && card.pokemon.stage === "Basic") {
      hasBasicPokemon = true;
    }
  }

  for (const [cardName, copies] of copiesByName) {
    if (copies > MAX_COPIES_PER_NAME) {
      violations.push({
        rule: "copy-limit",
        message: `A deck may contain at most ${MAX_COPIES_PER_NAME} copies of "${cardName}" (counting all art variants); this one has ${copies}.`,
        cardName,
        copies,
      });
    }
  }

  if (!hasBasicPokemon) {
    violations.push({
      rule: "no-basic-pokemon",
      message: "A deck must contain at least one Basic Pokémon.",
    });
  }

  const energyTypeCount = new Set(deck.energyTypes).size;
  if (energyTypeCount < MIN_ENERGY_TYPES || energyTypeCount > MAX_ENERGY_TYPES) {
    violations.push({
      rule: "energy-type-count",
      message: `A deck must register between ${MIN_ENERGY_TYPES} and ${MAX_ENERGY_TYPES} Energy Zone types; this one registers ${energyTypeCount}.`,
      energyTypeCount,
    });
  }

  return violations;
}
