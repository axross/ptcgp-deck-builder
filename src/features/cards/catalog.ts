import { z } from "zod";
import geneticApexA1 from "./data/genetic-apex-a1.json";
import { type Card, cardSchema } from "./schema";

/**
 * The static card catalog. The dataset (~370 KB of JSON) is meant for the
 * server tier — pass individual cards or filtered lists to client components
 * as props instead of importing this module from client code.
 */

let cachedCards: readonly Card[] | null = null;
let cachedById: ReadonlyMap<string, Card> | null = null;

/**
 * Returns every card in the catalog, validated against the card schema.
 *
 * @throws when the bundled dataset does not match the schema — a data defect
 *   that should surface at build/test time, never in response to user input.
 */
export function getAllCards(): readonly Card[] {
  if (cachedCards === null) {
    const result = z.array(cardSchema).safeParse(geneticApexA1);
    if (!result.success) {
      throw new Error(
        `getAllCards() failed to validate the bundled card catalog: ${result.error.message}`,
      );
    }
    cachedCards = result.data;
  }
  return cachedCards;
}

/** Returns the card with the given id (e.g. "A1-001"), or null when unknown. */
export function getCard(id: string): Card | null {
  if (cachedById === null) {
    cachedById = new Map(getAllCards().map((card) => [card.id, card]));
  }
  return cachedById.get(id) ?? null;
}
