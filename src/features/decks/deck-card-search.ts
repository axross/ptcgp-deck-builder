import type { EnergyType } from "@/features/cards/schema";
import type { DeckBuilderCard } from "./deck-card";

/**
 * Client-side filtering for the deck editor's card picker. The picker keeps the
 * catalog projection in memory and narrows it here as the visitor searches —
 * deliberately separate from the server-rendered `/cards` filter so the
 * stateful editor never has to navigate to filter. Pure and unit-tested.
 */

/** The picker's filter axes; an absent field means "no constraint". */
export type PickerCriteria = {
  type?: EnergyType;
  /** A Pokémon stage or the Trainer category. */
  kind?: "Basic" | "Stage1" | "Stage2" | "Trainer";
  query?: string;
};

/** True when `card` satisfies every present constraint in `criteria`. */
export function matchesPickerCriteria(card: DeckBuilderCard, criteria: PickerCriteria): boolean {
  if (criteria.type !== undefined) {
    if (card.category !== "Pokemon" || card.type !== criteria.type) {
      return false;
    }
  }
  if (criteria.kind !== undefined) {
    if (criteria.kind === "Trainer") {
      if (card.category !== "Trainer") {
        return false;
      }
    } else if (card.category !== "Pokemon" || card.stage !== criteria.kind) {
      return false;
    }
  }
  if (criteria.query !== undefined) {
    const needle = criteria.query.trim().toLowerCase();
    if (needle !== "" && !card.name.toLowerCase().includes(needle)) {
      return false;
    }
  }
  return true;
}

/** Returns the cards matching every present constraint, preserving order. */
export function filterPickerCards(
  cards: readonly DeckBuilderCard[],
  criteria: PickerCriteria,
): DeckBuilderCard[] {
  return cards.filter((card) => matchesPickerCriteria(card, criteria));
}
