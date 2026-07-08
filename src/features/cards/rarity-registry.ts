import type { RarityCode } from "./schema";

/**
 * The registry of rarity tiers — the single source of each tier's display
 * facts, keyed by the rarity codes owned by the card schema (`rarityCodes` in
 * schema.ts, which also owns the canonical tier order). A card stores only its
 * code; symbol and label resolve here, mirroring how set metadata resolves
 * through set-registry.ts. `Record<RarityCode, …>` keeps this exhaustive by
 * type: extending the code enum without a row here is a compile error.
 *
 * Sourced from the ptcgp-domain skill's card-data reference (rarity table).
 * Note `SR` and `SAR` share the ☆☆ symbol — they are distinct tiers told apart
 * by code, never by symbol.
 */

/** A rarity tier's display facts: in-game symbol and human-facing label. */
export type RarityDisplay = {
  /** In-game rarity symbol, e.g. "◇◇" or "☆". */
  symbol: string;
  /** Human-facing tier name, e.g. "Uncommon". */
  label: string;
};

const rarityDisplays: Record<RarityCode, RarityDisplay> = {
  C: { symbol: "◇", label: "Common" },
  U: { symbol: "◇◇", label: "Uncommon" },
  R: { symbol: "◇◇◇", label: "Rare" },
  RR: { symbol: "◇◇◇◇", label: "Double Rare" },
  AR: { symbol: "☆", label: "Art Rare" },
  S: { symbol: "✸", label: "Shiny" },
  SR: { symbol: "☆☆", label: "Super Rare" },
  SAR: { symbol: "☆☆", label: "Special Art Rare" },
  SSR: { symbol: "✸✸", label: "Shiny Super Rare" },
  IR: { symbol: "☆☆☆", label: "Immersive Rare" },
  CR: { symbol: "♛", label: "Crown Rare" },
};

/** Returns the display facts (symbol, label) for a rarity code. */
export function getRarity(code: RarityCode): RarityDisplay {
  return rarityDisplays[code];
}
