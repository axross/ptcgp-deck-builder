import {
  type CardKind,
  cardKindLabels,
  cardKindOf,
  type KindOption,
  toKindOptions,
} from "./card-filters";
import { getCardImageUrl } from "./card-images";
import { getRarity } from "./rarity-registry";
import { type Card, type EnergyType, type RarityCode, rarityCodes } from "./schema";
import { getSet, setCodes } from "./set-registry";

/**
 * View models for the card browser. The route builds these on the server and
 * passes them to the grid so the multi-megabyte catalog never crosses to the client —
 * a tile only carries the handful of fields it renders (see ptcgp-domain:
 * "pass cards/filtered lists to client components as props").
 */

/** Everything a card tile renders, derived once on the server per card. */
export type CardTileView = {
  id: string;
  name: string;
  imageUrl: string;
  /** Energy type for Pokémon (drives the type pictogram); `null` for Trainers. */
  type: EnergyType | null;
  /** The card's kind (stage or Trainer subtype), driving the kind pictogram. */
  kind: CardKind;
  /** Badge label: the energy type for Pokémon, "Trainer" otherwise. */
  typeLabel: string;
  /** Stage (Pokémon) or subtype (Trainer), e.g. "Stage 1" / "Pokémon Tool". */
  kindLabel: string;
  /** HP for Pokémon; `null` for Trainers. */
  hp: number | null;
  rarityLabel: string;
};

/** The badge/type label for a card: its energy type, or "Trainer". */
export function cardTypeLabel(card: Card): string {
  return card.category === "Pokemon" ? card.pokemon.type : "Trainer";
}

/** The kind label: a Pokémon's stage or a Trainer's subtype, in display form. */
export function cardKindLabel(card: Card): string {
  return cardKindLabels[cardKindOf(card)];
}

/** Builds the tile view model for a single card. */
export function toCardTileView(card: Card): CardTileView {
  return {
    id: card.id,
    name: card.name.en,
    imageUrl: getCardImageUrl(card),
    type: card.category === "Pokemon" ? card.pokemon.type : null,
    kind: cardKindOf(card),
    typeLabel: cardTypeLabel(card),
    kindLabel: cardKindLabel(card),
    hp: card.category === "Pokemon" ? card.pokemon.hp : null,
    rarityLabel: getRarity(card.rarity).label,
  };
}

/** A rarity choice for the filter control: the code plus its display label. */
export type RarityOption = { code: RarityCode; label: string };

/**
 * The distinct rarities present in `cards`, in canonical tier order (the
 * `rarityCodes` order owned by the schema), each labelled from the rarity
 * registry. Derived from the catalog rather than hard-coded so a new set's
 * tiers appear without a second edit.
 */
export function deriveRarityOptions(cards: readonly Card[]): RarityOption[] {
  const present = new Set(cards.map((card) => card.rarity));
  return rarityCodes
    .filter((code) => present.has(code))
    .map((code) => ({ code, label: getRarity(code).label }));
}

export type { KindOption } from "./card-filters";

/**
 * The distinct kinds present in `cards`, in canonical (`cardKinds`) order,
 * each with its display label. Derived from the catalog so a kind no seeded
 * set contains (e.g. Fossil today) never appears as a dead filter option.
 */
export function deriveKindOptions(cards: readonly Card[]): KindOption[] {
  return toKindOptions(cards.map(cardKindOf));
}

/** A set choice for the filter control: the set code plus its display label. */
export type SetOption = { code: string; label: string };

/**
 * The distinct sets present in `cards`, in registry (chronological) order, each
 * labelled from the set registry. Derived from the catalog so only seeded sets
 * are offered — a set with no cards yet never appears as a dead filter option —
 * and set names come from the registry rather than being hardcoded here.
 */
export function deriveSetOptions(cards: readonly Card[]): SetOption[] {
  const present = new Set(cards.map((card) => card.setCode));
  return setCodes
    .filter((code) => present.has(code))
    .map((code) => {
      const set = getSet(code);
      return { code, label: set ? `${set.name} (${code})` : code };
    });
}
