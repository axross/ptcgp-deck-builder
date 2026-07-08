import "server-only";
import { z } from "zod";
import celestialGuardiansA3 from "./data/celestial-guardians-a3.json";
import crimsonBlazeB1a from "./data/crimson-blaze-b1a.json";
import eeveeGroveA3b from "./data/eevee-grove-a3b.json";
import everydayWondersB3b from "./data/everyday-wonders-b3b.json";
import extradimensionalCrisisA3a from "./data/extradimensional-crisis-a3a.json";
import fantasticalParadeB2 from "./data/fantastical-parade-b2.json";
import geneticApexA1 from "./data/genetic-apex-a1.json";
import megaRisingB1 from "./data/mega-rising-b1.json";
import megaShineB2b from "./data/mega-shine-b2b.json";
import mythicalIslandA1a from "./data/mythical-island-a1a.json";
import paldeanWondersB2a from "./data/paldean-wonders-b2a.json";
import paradoxDriveB3a from "./data/paradox-drive-b3a.json";
import pulsingAuraB3 from "./data/pulsing-aura-b3.json";
import secludedSpringsA4a from "./data/secluded-springs-a4a.json";
import shiningRevelryA2b from "./data/shining-revelry-a2b.json";
import spaceTimeSmackdownA2 from "./data/space-time-smackdown-a2.json";
import triumphantLightA2a from "./data/triumphant-light-a2a.json";
import wisdomOfSeaAndSkyA4 from "./data/wisdom-of-sea-and-sky-a4.json";
import { type Card, cardSchema } from "./schema";
import { getSet, type SetCode } from "./set-registry";

/**
 * The static, set-aware card catalog. Each expansion is one JSON file under
 * `data/`, registered once in {@link seededSets}; `getAllCards()` spans them
 * all and card ids stay globally unique via the set-code prefix ("A1-001").
 *
 * The dataset is server-tier only — enforced by the `server-only` import above,
 * which fails the build if a client component pulls this module in. As more
 * sets are seeded the payload grows, so the per-set accessors let a route load
 * only the sets it needs; pass individual cards or filtered lists to client
 * components as props. (Vitest aliases `server-only` to a stub; see
 * vitest.config.ts.)
 */

/**
 * One entry per seeded set data file, in registry order. Registering a new set
 * is a single edit here (plus its row in the set registry). The `code` is
 * declared alongside the import so a data file that does not match its set is
 * caught by {@link getCatalog}.
 */
const seededSets: readonly { code: SetCode; data: unknown }[] = [
  { code: "A1", data: geneticApexA1 },
  { code: "A1a", data: mythicalIslandA1a },
  { code: "A2", data: spaceTimeSmackdownA2 },
  { code: "A2a", data: triumphantLightA2a },
  { code: "A2b", data: shiningRevelryA2b },
  { code: "A3", data: celestialGuardiansA3 },
  { code: "A3a", data: extradimensionalCrisisA3a },
  { code: "A3b", data: eeveeGroveA3b },
  { code: "A4", data: wisdomOfSeaAndSkyA4 },
  { code: "A4a", data: secludedSpringsA4a },
  { code: "B1", data: megaRisingB1 },
  { code: "B1a", data: crimsonBlazeB1a },
  { code: "B2", data: fantasticalParadeB2 },
  { code: "B2a", data: paldeanWondersB2a },
  { code: "B2b", data: megaShineB2b },
  { code: "B3", data: pulsingAuraB3 },
  { code: "B3a", data: paradoxDriveB3a },
  { code: "B3b", data: everydayWondersB3b },
];

type Catalog = {
  cards: readonly Card[];
  byId: ReadonlyMap<string, Card>;
  bySet: ReadonlyMap<SetCode, readonly Card[]>;
};

let cache: Catalog | null = null;

function getCatalog(): Catalog {
  if (cache === null) {
    const cards: Card[] = [];
    const bySet = new Map<SetCode, readonly Card[]>();

    for (const { code, data } of seededSets) {
      const result = z.array(cardSchema).safeParse(data);
      if (!result.success) {
        throw new Error(
          `getCatalog() failed to validate the bundled "${code}" card data: ${result.error.message}`,
        );
      }
      const mismatched = result.data.find((card) => card.setCode !== code);
      if (mismatched !== undefined) {
        throw new Error(
          `getCatalog() found card "${mismatched.id}" (set ${mismatched.setCode}) in the "${code}" data file.`,
        );
      }
      const expected = getSet(code)?.cardCount;
      if (expected !== undefined && result.data.length !== expected) {
        throw new Error(
          `getCatalog() expected ${expected} cards for set "${code}" (per the registry) but the data file has ${result.data.length}.`,
        );
      }
      cards.push(...result.data);
      bySet.set(code, result.data);
    }

    cache = {
      cards,
      byId: new Map(cards.map((card) => [card.id, card])),
      bySet,
    };
  }
  return cache;
}

/**
 * Returns every card across all seeded sets, validated against the card schema.
 *
 * @throws when a bundled dataset does not match the schema, is filed under the
 *   wrong set, or disagrees with the registry's card count — data defects that
 *   should surface at build/test time, never in response to user input.
 */
export function getAllCards(): readonly Card[] {
  return getCatalog().cards;
}

/** Returns the card with the given id (e.g. "A1-001"), or null when unknown. */
export function getCard(id: string): Card | null {
  return getCatalog().byId.get(id) ?? null;
}

/** Returns exactly the seeded cards of one set, or an empty list if unseeded. */
export function getCardsBySet(code: SetCode): readonly Card[] {
  return getCatalog().bySet.get(code) ?? [];
}

/** Returns how many cards of `code` are seeded (0 when the set has no data file). */
export function getSetCardCount(code: SetCode): number {
  return getCardsBySet(code).length;
}

/** The set codes that currently have seeded card data, in registry order. */
export function getSeededSetCodes(): readonly SetCode[] {
  return [...getCatalog().bySet.keys()];
}
