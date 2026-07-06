import { z } from "zod";
import { readStorageItem, writeStorageItem } from "@/lib/storage";
import { type Deck, deckSchema } from "./schema";

/**
 * Browser persistence for saved decks. Every deck the visitor saves lives in
 * `localStorage` under one versioned envelope, read and written only through
 * `src/lib/storage.ts` (schema-validated) — never raw `localStorage`, and never
 * from a component. Storage is injected so the store and unit tests can supply
 * a fake; the app passes `window.localStorage`.
 */

/** The single `localStorage` key holding every saved deck. */
export const DECK_STORAGE_KEY = "ptcgp-deck-builder:decks";

/** Current envelope version; bump when the persisted shape changes. */
export const DECK_STORE_VERSION = 1;

/**
 * The persisted envelope: a version tag plus the deck list. Wrapping the decks
 * lets a future migration recognize and upgrade older data instead of silently
 * discarding it (a read that fails to validate is treated as absent).
 */
export const deckStoreEnvelopeSchema = z.object({
  version: z.literal(DECK_STORE_VERSION),
  decks: z.array(deckSchema),
});

export type DeckStoreEnvelope = z.infer<typeof deckStoreEnvelopeSchema>;

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "getItem" | "setItem">;

/** Every saved deck, in stored order. An absent/corrupt envelope reads as `[]`. */
export function loadDecks(storage: ReadableStorage): Deck[] {
  const envelope = readStorageItem(storage, DECK_STORAGE_KEY, deckStoreEnvelopeSchema);
  return envelope?.decks ?? [];
}

/** The saved deck with `deckId`, or `null` when none exists (or data is corrupt). */
export function loadDeck(storage: ReadableStorage, deckId: string): Deck | null {
  return loadDecks(storage).find((deck) => deck.id === deckId) ?? null;
}

/**
 * Inserts or replaces `deck` (matched by id) in the stored envelope. Returns
 * `false` when the write is rejected (quota exceeded, private browsing) so the
 * caller can surface a visible error rather than crash.
 */
export function saveDeck(storage: WritableStorage, deck: Deck): boolean {
  const decks = loadDecks(storage);
  const index = decks.findIndex((existing) => existing.id === deck.id);
  if (index === -1) {
    decks.push(deck);
  } else {
    decks[index] = deck;
  }
  const envelope: DeckStoreEnvelope = { version: DECK_STORE_VERSION, decks };
  return writeStorageItem(storage, DECK_STORAGE_KEY, envelope);
}

/**
 * Removes the deck with `deckId` from the stored envelope. Returns `false`
 * when the rewrite is rejected (quota exceeded, private browsing) so the caller
 * can keep its in-memory list consistent with storage; removing an id that is
 * absent still rewrites and reports the write's success.
 */
export function deleteDeck(storage: WritableStorage, deckId: string): boolean {
  const decks = loadDecks(storage).filter((deck) => deck.id !== deckId);
  const envelope: DeckStoreEnvelope = { version: DECK_STORE_VERSION, decks };
  return writeStorageItem(storage, DECK_STORAGE_KEY, envelope);
}
