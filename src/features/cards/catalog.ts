import "server-only";
import { z } from "zod";
import geneticApexA1 from "./data/genetic-apex-a1.json";
import { type Card, cardSchema } from "./schema";

/**
 * The static card catalog. The dataset (~370 KB of JSON) is server-tier only
 * — enforced by the `server-only` import above, which fails the build if a
 * client component pulls this module in. Pass individual cards or filtered
 * lists to client components as props instead. (Vitest aliases `server-only`
 * to a stub; see vitest.config.ts.)
 */

let cache: { cards: readonly Card[]; byId: ReadonlyMap<string, Card> } | null = null;

function getCatalog(): NonNullable<typeof cache> {
  if (cache === null) {
    const result = z.array(cardSchema).safeParse(geneticApexA1);
    if (!result.success) {
      throw new Error(
        `getCatalog() failed to validate the bundled card catalog: ${result.error.message}`,
      );
    }
    cache = {
      cards: result.data,
      byId: new Map(result.data.map((card) => [card.id, card])),
    };
  }
  return cache;
}

/**
 * Returns every card in the catalog, validated against the card schema.
 *
 * @throws when the bundled dataset does not match the schema — a data defect
 *   that should surface at build/test time, never in response to user input.
 */
export function getAllCards(): readonly Card[] {
  return getCatalog().cards;
}

/** Returns the card with the given id (e.g. "A1-001"), or null when unknown. */
export function getCard(id: string): Card | null {
  return getCatalog().byId.get(id) ?? null;
}
