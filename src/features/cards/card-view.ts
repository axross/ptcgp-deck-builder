import { getCardImageUrl } from "./card-images";
import type { Card } from "./schema";
import { getSet, setCodes } from "./set-registry";

/**
 * View models for the card browser. The route builds these on the server and
 * passes them to the grid so the ~370 KB catalog never crosses to the client —
 * a tile only carries the handful of fields it renders (see ptcgp-domain:
 * "pass cards/filtered lists to client components as props").
 */

/** Everything a card tile renders, derived once on the server per card. */
export type CardTileView = {
  id: string;
  name: string;
  imageUrl: string;
  /** Badge label: the energy type for Pokémon, "Trainer" otherwise. */
  typeLabel: string;
  /** Stage (Pokémon) or subtype (Trainer), e.g. "Stage 1" / "Supporter". */
  kindLabel: string;
  /** HP for Pokémon; `null` for Trainers. */
  hp: number | null;
  rarityLabel: string;
};

const pokemonStageLabels = {
  Basic: "Basic",
  Stage1: "Stage 1",
  Stage2: "Stage 2",
} as const;

/** The badge/type label for a card: its energy type, or "Trainer". */
export function cardTypeLabel(card: Card): string {
  return card.category === "Pokemon" ? card.pokemon.type : "Trainer";
}

/** The kind label: a Pokémon's stage or a Trainer's subtype. */
export function cardKindLabel(card: Card): string {
  if (card.category === "Pokemon") {
    return pokemonStageLabels[card.pokemon.stage];
  }
  return card.trainer.subtype;
}

/** Builds the tile view model for a single card. */
export function toCardTileView(card: Card): CardTileView {
  return {
    id: card.id,
    name: card.name.en,
    imageUrl: getCardImageUrl(card),
    typeLabel: cardTypeLabel(card),
    kindLabel: cardKindLabel(card),
    hp: card.category === "Pokemon" ? card.pokemon.hp : null,
    rarityLabel: card.rarity.label,
  };
}

/** A rarity choice for the filter control: the code plus its display label. */
export type RarityOption = { code: string; label: string };

// Canonical tier order (mirrors the rarity codes enum in schema.ts) so the
// filter control lists rarities from common to crown regardless of the order
// cards happen to appear in the dataset.
const rarityCodeOrder = ["C", "U", "R", "RR", "AR", "SR", "SAR", "IR", "S", "SSR", "CR"];

/**
 * The distinct rarities present in `cards`, in canonical tier order. Derived
 * from the catalog rather than hard-coded so a new set's tiers appear without a
 * second edit.
 */
export function deriveRarityOptions(cards: readonly Card[]): RarityOption[] {
  const byCode = new Map<string, string>();
  for (const card of cards) {
    if (!byCode.has(card.rarity.code)) {
      byCode.set(card.rarity.code, card.rarity.label);
    }
  }
  return [...byCode.entries()]
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => {
      const ai = rarityCodeOrder.indexOf(a.code);
      const bi = rarityCodeOrder.indexOf(b.code);
      // Unknown codes (a set newer than this list) sort to the end, stably.
      return (
        (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
      );
    });
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
  const present = new Set(cards.map((card) => card.set.code));
  return setCodes
    .filter((code) => present.has(code))
    .map((code) => {
      const set = getSet(code);
      return { code, label: set ? `${set.name} (${code})` : code };
    });
}
