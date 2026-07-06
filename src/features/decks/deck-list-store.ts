import { createStore } from "zustand/vanilla";
import type { DeckBuilderCard } from "./deck-card";
import { toDeckCard } from "./deck-card";
import { validateDeck } from "./deck-rules";
import { deleteDeck as deleteDeckFromStorage, loadDecks } from "./deck-storage";
import type { Deck, RegistrableEnergyType } from "./schema";

/**
 * The saved-deck list session for `/decks`. Reads every deck from the browser
 * envelope through `deck-storage` and deletes one by rewriting that same
 * envelope — no new persistence shape. Storage is injected so the store is
 * unit-testable with a fake; the app passes `window.localStorage`. Legality is
 * never recomputed here — {@link summarizeDeck} routes it to the domain layer's
 * `validateDeck`, the same rule the editor uses.
 */

/** Injected side effects, so the store is unit-testable with fakes. */
export type DeckListStoreDeps = {
  /** Deferred so `window.localStorage` is read on the client only. */
  getStorage: () => Pick<Storage, "getItem" | "setItem">;
};

/** Outcome of the most recent delete attempt, surfaced to the user. */
export type DeleteResult = { status: "idle" } | { status: "error"; message: string };

export type DeckListState = {
  /** Every saved deck, in stored order. Empty until {@link load} runs. */
  decks: Deck[];
  /** `false` until the first client-side {@link load}; distinguishes the
   * pre-hydration render from a genuinely empty list. */
  loaded: boolean;
  deleteResult: DeleteResult;

  /** Reads the saved decks from storage into memory. Runs on mount. */
  load: () => void;
  /** Deletes a deck from storage and the in-memory list; returns whether the
   * write succeeded. On a rejected write the list is left untouched. */
  deleteDeck: (deckId: string) => boolean;
};

export type DeckListStore = ReturnType<typeof createDeckListStore>;

export function createDeckListStore(deps: DeckListStoreDeps) {
  const { getStorage } = deps;

  return createStore<DeckListState>()((set) => ({
    decks: [],
    loaded: false,
    deleteResult: { status: "idle" },

    load: () => set({ decks: loadDecks(getStorage()), loaded: true }),

    deleteDeck: (deckId) => {
      const ok = deleteDeckFromStorage(getStorage(), deckId);
      if (ok) {
        set((state) => ({
          decks: state.decks.filter((deck) => deck.id !== deckId),
          deleteResult: { status: "idle" },
        }));
      } else {
        set({
          deleteResult: {
            status: "error",
            message: "Couldn't delete — your browser blocked storage (it may be full or private).",
          },
        });
      }
      return ok;
    },
  }));
}

/** A saved deck reduced to the facts the list surface displays. */
export type DeckSummary = {
  deck: Deck;
  /** Total cards including duplicates. */
  cardCount: number;
  energyTypes: RegistrableEnergyType[];
  /** Legality from the domain rules — never recomputed locally. */
  isLegal: boolean;
};

/**
 * Projects a saved deck into the {@link DeckSummary} the list renders. Legality
 * runs through the same `validateDeck` the editor uses, with card lookups from
 * the server-supplied catalog projection (unknown ids resolve to `null`, which
 * the rules already treat as a violation).
 */
export function summarizeDeck(
  deck: Deck,
  catalog: ReadonlyMap<string, DeckBuilderCard>,
): DeckSummary {
  const getCard = (id: string) => {
    const card = catalog.get(id);
    return card ? toDeckCard(card) : null;
  };
  return {
    deck,
    cardCount: deck.cards.length,
    energyTypes: deck.energyTypes,
    isLegal: validateDeck(deck, getCard).length === 0,
  };
}
