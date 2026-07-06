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
 * A card "kind": either a Pokémon stage or the Trainer category. This is the
 * shape the kind filter selects on ("Pokémon by stage / Trainer").
 */
export const cardKinds = ["Basic", "Stage1", "Stage2", "Trainer"] as const;
export type CardKind = (typeof cardKinds)[number];

/** Human-facing label for each {@link CardKind}, in filter-control order. */
export const cardKindLabels: Record<CardKind, string> = {
  Basic: "Basic",
  Stage1: "Stage 1",
  Stage2: "Stage 2",
  Trainer: "Trainer",
};

/**
 * A validated filter selection. Every field is optional; an absent field means
 * "no constraint on this axis". Present fields intersect (logical AND).
 */
export type CardFilterCriteria = {
  type?: EnergyType;
  rarity?: string;
  kind?: CardKind;
  query?: string;
};

function matchesKind(card: Card, kind: CardKind): boolean {
  if (kind === "Trainer") {
    return card.category === "Trainer";
  }
  return card.category === "Pokemon" && card.pokemon.stage === kind;
}

/** True when `card` satisfies every present constraint in `criteria`. */
export function matchesCardFilters(card: Card, criteria: CardFilterCriteria): boolean {
  if (criteria.type !== undefined) {
    if (card.category !== "Pokemon" || card.pokemon.type !== criteria.type) {
      return false;
    }
  }
  if (criteria.rarity !== undefined && card.rarity.code !== criteria.rarity) {
    return false;
  }
  if (criteria.kind !== undefined && !matchesKind(card, criteria.kind)) {
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
 * Parses untrusted URL search params into a validated {@link CardFilterCriteria}.
 * Unknown or malformed values are dropped (treated as "no filter") rather than
 * throwing — a bookmarked URL from an older build must still render.
 *
 * @param raw - the route's `searchParams`
 * @param rarityCodes - the rarity codes present in the catalog, so an unknown
 *   rarity in the URL is dropped
 */
export function parseCardFilters(
  raw: RawSearchParams,
  rarityCodes: readonly string[],
): CardFilterCriteria {
  const criteria: CardFilterCriteria = {};

  const type = energyTypeSchema.safeParse(firstValue(raw[cardFilterParamNames.type]));
  if (type.success) {
    criteria.type = type.data;
  }

  const rarity = firstValue(raw[cardFilterParamNames.rarity]);
  if (rarity !== undefined && rarityCodes.includes(rarity)) {
    criteria.rarity = rarity;
  }

  const kind = firstValue(raw[cardFilterParamNames.kind]);
  if (kind !== undefined && knownKinds.has(kind)) {
    criteria.kind = kind as CardKind;
  }

  const query = firstValue(raw[cardFilterParamNames.query]);
  if (query !== undefined && query.trim() !== "") {
    criteria.query = query;
  }

  return criteria;
}
