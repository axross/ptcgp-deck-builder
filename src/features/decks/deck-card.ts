import type { CardKind } from "@/features/cards/card-filters";
import { getCardImageUrl } from "@/features/cards/card-images";
import { cardKindLabel, cardTypeLabel } from "@/features/cards/card-view";
import { getRarity } from "@/features/cards/rarity-registry";
import type { Card, PokemonCard, TrainerCard } from "@/features/cards/schema";

/** A Pokémon evolution stage (mirrors the card schema's stage enum). */
export type PokemonStage = PokemonCard["pokemon"]["stage"];

/** A Trainer subtype (mirrors the card schema's trainer-subtype enum). */
export type TrainerSubtype = TrainerCard["trainer"]["subtype"];

/**
 * The minimal card facts the deck-construction rules and advice actually read.
 * A full catalog {@link Card} is structurally assignable to this, so
 * `validateDeck`/`adviseDeck` run identically on the server (with real catalog
 * cards, in unit tests) and in the browser editor — where only this projection
 * is available, keeping the multi-megabyte catalog on the server tier.
 */
export type DeckCard =
  | {
      category: "Pokemon";
      name: { en: string };
      pokemon: { stage: PokemonStage; evolvesFrom: string | null };
    }
  | { category: "Trainer"; name: { en: string } };

/**
 * Everything the client deck editor needs per catalog card: display fields for
 * the picker and deck panel, plus the raw fields the rules ({@link DeckCard})
 * and the picker filter consume. Built once on the server per card so the full
 * catalog never crosses to the client (see ptcgp-domain: pass projections, not
 * the dataset).
 */
export type DeckBuilderCard = {
  id: string;
  /** English name — the identity the copy limit counts by. */
  name: string;
  imageUrl: string;
  /** Badge label: the energy type for Pokémon, "Trainer" otherwise. */
  typeLabel: string;
  /** Stage (Pokémon) or subtype (Trainer), e.g. "Stage 1" / "Supporter". */
  kindLabel: string;
  /** HP for Pokémon; `null` for Trainers. */
  hp: number | null;
  rarityLabel: string;
} & (
  | { category: "Pokemon"; type: string; stage: PokemonStage; evolvesFrom: string | null }
  | { category: "Trainer"; subtype: TrainerSubtype }
);

/** The {@link CardKind} of a projected card: its stage or Trainer subtype. */
export function deckBuilderCardKind(card: DeckBuilderCard): CardKind {
  return card.category === "Pokemon" ? card.stage : card.subtype;
}

/** Projects a catalog card into the client-side {@link DeckBuilderCard}. */
export function toDeckBuilderCard(card: Card): DeckBuilderCard {
  const shared = {
    id: card.id,
    name: card.name.en,
    imageUrl: getCardImageUrl(card),
    typeLabel: cardTypeLabel(card),
    kindLabel: cardKindLabel(card),
    hp: card.category === "Pokemon" ? card.pokemon.hp : null,
    rarityLabel: getRarity(card.rarity).label,
  };
  if (card.category === "Pokemon") {
    return {
      ...shared,
      category: "Pokemon",
      type: card.pokemon.type,
      stage: card.pokemon.stage,
      evolvesFrom: card.pokemon.evolvesFrom,
    };
  }
  return { ...shared, category: "Trainer", subtype: card.trainer.subtype };
}

/**
 * Narrows a {@link DeckBuilderCard} to the {@link DeckCard} rule shape the
 * domain functions consume — the editor's client-side bridge to the same
 * `validateDeck`/`adviseDeck` the server uses.
 */
export function toDeckCard(card: DeckBuilderCard): DeckCard {
  if (card.category === "Pokemon") {
    return {
      category: "Pokemon",
      name: { en: card.name },
      pokemon: { stage: card.stage, evolvesFrom: card.evolvesFrom },
    };
  }
  return { category: "Trainer", name: { en: card.name } };
}
