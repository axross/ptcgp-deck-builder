import type { Card } from "./schema";
import { type EnergyType, energyTypeSchema } from "./schema";

/**
 * Pure, catalog-agnostic filtering for the card browser. The route reads the
 * catalog on the server, parses the (untrusted) URL search params into a
 * {@link CardFilterCriteria} with {@link parseCardFilters}, and narrows the
 * list with {@link filterCards}. Keeping this logic here — not inline in the
 * route — is what makes it unit-testable per the ptcgp-domain / component
 * guidelines.
 */

/**
 * A card "kind": a Pokémon evolution stage or a Trainer subtype. This is the
 * vocabulary the kind filter selects on and the canonical display order.
 * Mirrors the schema's stage and trainer-subtype enums; a value's presence
 * here does not imply the seeded catalog contains it (Fossil doesn't exist in
 * any seeded set yet) — derive offered options from the catalog instead.
 */
export const cardKinds = [
  "Basic",
  "Stage1",
  "Stage2",
  "Supporter",
  "Item",
  "PokemonTool",
  "Stadium",
  "Fossil",
] as const;
export type CardKind = (typeof cardKinds)[number];

/** Human-facing label for each {@link CardKind}. */
export const cardKindLabels: Record<CardKind, string> = {
  Basic: "Basic",
  Stage1: "Stage 1",
  Stage2: "Stage 2",
  Supporter: "Supporter",
  Item: "Item",
  PokemonTool: "Pokémon Tool",
  Stadium: "Stadium",
  Fossil: "Fossil",
};

/** The {@link CardKind} of a card: its stage (Pokémon) or subtype (Trainer). */
export function cardKindOf(card: Card): CardKind {
  return card.category === "Pokemon" ? card.pokemon.stage : card.trainer.subtype;
}

/**
 * A validated filter selection. Every field is optional; an absent field means
 * "no constraint on this axis". Present fields intersect (logical AND).
 */
export type CardFilterCriteria = {
  type?: EnergyType;
  rarity?: string;
  kind?: CardKind;
  set?: string;
  query?: string;
};

function matchesKind(card: Card, kind: CardKind): boolean {
  return cardKindOf(card) === kind;
}

/** True when `card` satisfies every present constraint in `criteria`. */
export function matchesCardFilters(card: Card, criteria: CardFilterCriteria): boolean {
  if (criteria.type !== undefined) {
    if (card.category !== "Pokemon" || card.pokemon.type !== criteria.type) {
      return false;
    }
  }
  if (criteria.rarity !== undefined && card.rarity !== criteria.rarity) {
    return false;
  }
  if (criteria.kind !== undefined && !matchesKind(card, criteria.kind)) {
    return false;
  }
  if (criteria.set !== undefined && card.setCode !== criteria.set) {
    return false;
  }
  if (criteria.query !== undefined) {
    const needle = criteria.query.trim().toLowerCase();
    if (needle !== "" && !card.name.en.toLowerCase().includes(needle)) {
      return false;
    }
  }
  return true;
}

/** Returns the cards matching every present constraint, preserving order. */
export function filterCards(cards: readonly Card[], criteria: CardFilterCriteria): readonly Card[] {
  return cards.filter((card) => matchesCardFilters(card, criteria));
}

/**
 * True when no constraint is set — used to distinguish the default "all cards"
 * state from a filtered-but-empty result (the empty state only shows for the
 * latter).
 */
export function hasActiveFilters(criteria: CardFilterCriteria): boolean {
  return (
    criteria.type !== undefined ||
    criteria.rarity !== undefined ||
    criteria.kind !== undefined ||
    criteria.set !== undefined ||
    (criteria.query !== undefined && criteria.query.trim() !== "")
  );
}

/**
 * The URL param names the filter bar reads and writes. Exported so the client
 * control and the server parser cannot drift on the spelling.
 */
export const cardFilterParamNames = {
  type: "type",
  rarity: "rarity",
  kind: "kind",
  set: "set",
  query: "q",
} as const;

/**
 * Next.js delivers each search param as a string, an array (repeated key), or
 * undefined. Reduce to the first present string so the parser sees one value.
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) {
    return raw[0];
  }
  return raw;
}

const knownKinds = new Set<string>(cardKinds);

/**
 * The catalog-derived option sets a URL parse validates against, so a value not
 * present in the current catalog (an unknown rarity, an unseeded set) is dropped
 * rather than filtering the grid to nothing.
 */
export type CardFilterOptions = {
  rarityCodes: readonly string[];
  setCodes: readonly string[];
};

/**
 * Parses untrusted URL search params into a validated {@link CardFilterCriteria}.
 * Unknown or malformed values are dropped (treated as "no filter") rather than
 * throwing — a bookmarked URL from an older build must still render.
 *
 * @param raw - the route's `searchParams`
 * @param options - the rarity/set codes present in the catalog, so an unknown
 *   value in the URL is dropped
 */
export function parseCardFilters(
  raw: RawSearchParams,
  options: CardFilterOptions,
): CardFilterCriteria {
  const criteria: CardFilterCriteria = {};

  const type = energyTypeSchema.safeParse(firstValue(raw[cardFilterParamNames.type]));
  if (type.success) {
    criteria.type = type.data;
  }

  const rarity = firstValue(raw[cardFilterParamNames.rarity]);
  if (rarity !== undefined && options.rarityCodes.includes(rarity)) {
    criteria.rarity = rarity;
  }

  const kind = firstValue(raw[cardFilterParamNames.kind]);
  if (kind !== undefined && knownKinds.has(kind)) {
    criteria.kind = kind as CardKind;
  }

  const set = firstValue(raw[cardFilterParamNames.set]);
  if (set !== undefined && options.setCodes.includes(set)) {
    criteria.set = set;
  }

  const query = firstValue(raw[cardFilterParamNames.query]);
  if (query !== undefined && query.trim() !== "") {
    criteria.query = query;
  }

  return criteria;
}
