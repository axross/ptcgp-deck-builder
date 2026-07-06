import { createStore } from "zustand/vanilla";
import { adviseDeck, type DeckAdvice } from "./deck-advice";
import { type DeckBuilderCard, toDeckCard } from "./deck-card";
import {
  type DeckRuleViolation,
  MAX_COPIES_PER_NAME,
  MAX_ENERGY_TYPES,
  validateDeck,
} from "./deck-rules";
import { saveDeck } from "./deck-storage";
import type { RegistrableEnergyType } from "./schema";

/**
 * The client-side deck-editing session. Holds the deck being built and the
 * catalog projection it draws from, exposes actions that keep the copy-limit
 * count in sync, and persists through `deck-storage`. Legality and advice are
 * never recomputed here — {@link deckDerived} routes them to the domain layer's
 * `validateDeck`/`adviseDeck` so the rules stay single-sourced.
 */

/** Injected side effects, so the store is unit-testable with fakes. */
export type DeckStoreDeps = {
  /** The catalog cards the picker offers, keyed by id. */
  catalog: ReadonlyMap<string, DeckBuilderCard>;
  /** Deferred so `window.localStorage` is read on the client at save time only. */
  getStorage: () => Pick<Storage, "getItem" | "setItem">;
  /** New-deck id factory (the app uses `crypto.randomUUID`). */
  generateId: () => string;
};

/** Outcome of the most recent save attempt, surfaced to the user. */
export type SaveResult =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type DeckEditorState = {
  /** The catalog projection the picker draws from (stable for the session). */
  catalog: ReadonlyMap<string, DeckBuilderCard>;
  /** Persisted id once saved; `null` for an unsaved new deck. */
  deckId: string | null;
  name: string;
  /** Card ids including duplicates — one entry per copy, in add order. */
  cardIds: string[];
  energyTypes: RegistrableEnergyType[];
  /** Copies per card *name* (the copy-limit identity), kept in sync on edits. */
  copiesByName: Record<string, number>;
  saveResult: SaveResult;

  setName: (name: string) => void;
  addCard: (cardId: string) => void;
  removeCard: (cardId: string) => void;
  toggleEnergyType: (type: RegistrableEnergyType) => void;
  loadNew: () => void;
  loadExisting: (deck: {
    id: string;
    name: string;
    cards: string[];
    energyTypes: RegistrableEnergyType[];
  }) => void;
  /** Persists the deck; returns the id and whether it was newly created. */
  save: () => { ok: boolean; deckId: string; wasNew: boolean };
};

/** Tallies copies per card name from card ids (unknown ids are skipped). */
export function countCopiesByName(
  cardIds: readonly string[],
  catalog: ReadonlyMap<string, DeckBuilderCard>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of cardIds) {
    const card = catalog.get(id);
    if (card === undefined) {
      continue;
    }
    counts[card.name] = (counts[card.name] ?? 0) + 1;
  }
  return counts;
}

export type DeckStore = ReturnType<typeof createDeckStore>;

export function createDeckStore(deps: DeckStoreDeps) {
  const { catalog, getStorage, generateId } = deps;

  const emptyState = {
    deckId: null as string | null,
    name: "",
    cardIds: [] as string[],
    energyTypes: [] as RegistrableEnergyType[],
    copiesByName: {} as Record<string, number>,
    saveResult: { status: "idle" } as SaveResult,
  };

  return createStore<DeckEditorState>()((set, get) => ({
    catalog,
    ...emptyState,

    setName: (name) => set({ name, saveResult: { status: "idle" } }),

    addCard: (cardId) => {
      const card = catalog.get(cardId);
      if (card === undefined) {
        return;
      }
      const { cardIds, copiesByName } = get();
      // The picker disables the add control at the limit; this guard keeps the
      // copy-limit-by-name invariant even if an add slips through.
      if ((copiesByName[card.name] ?? 0) >= MAX_COPIES_PER_NAME) {
        return;
      }
      const nextCardIds = [...cardIds, cardId];
      set({
        cardIds: nextCardIds,
        copiesByName: countCopiesByName(nextCardIds, catalog),
        saveResult: { status: "idle" },
      });
    },

    removeCard: (cardId) => {
      const { cardIds } = get();
      const index = cardIds.lastIndexOf(cardId);
      if (index === -1) {
        return;
      }
      const nextCardIds = cardIds.filter((_, i) => i !== index);
      set({
        cardIds: nextCardIds,
        copiesByName: countCopiesByName(nextCardIds, catalog),
        saveResult: { status: "idle" },
      });
    },

    toggleEnergyType: (type) => {
      const { energyTypes } = get();
      if (energyTypes.includes(type)) {
        set({
          energyTypes: energyTypes.filter((t) => t !== type),
          saveResult: { status: "idle" },
        });
        return;
      }
      if (energyTypes.length >= MAX_ENERGY_TYPES) {
        return;
      }
      set({ energyTypes: [...energyTypes, type], saveResult: { status: "idle" } });
    },

    loadNew: () => set({ ...emptyState }),

    loadExisting: (deck) =>
      set({
        ...emptyState,
        deckId: deck.id,
        name: deck.name,
        cardIds: [...deck.cards],
        energyTypes: [...deck.energyTypes],
        copiesByName: countCopiesByName(deck.cards, catalog),
      }),

    save: () => {
      const { deckId, name, cardIds, energyTypes } = get();
      const wasNew = deckId === null;
      const id = deckId ?? generateId();
      const ok = saveDeck(getStorage(), { id, name, cards: cardIds, energyTypes });
      if (ok) {
        set({
          deckId: id,
          saveResult: { status: "success", message: "Deck saved to this browser." },
        });
      } else {
        set({
          saveResult: {
            status: "error",
            message: "Couldn't save — your browser blocked storage (it may be full or private).",
          },
        });
      }
      return { ok, deckId: id, wasNew };
    },
  }));
}

/**
 * Derives legality, advice, and the grouped deck entries for the current state.
 * Kept a pure function (not stored) so the domain rules run against live state
 * and never drift; the client hook memoizes it per edit.
 */
export type DeckEntry = { card: DeckBuilderCard; count: number };

export function deckDerived(
  state: Pick<DeckEditorState, "deckId" | "name" | "cardIds" | "energyTypes">,
  catalog: ReadonlyMap<string, DeckBuilderCard>,
): {
  violations: DeckRuleViolation[];
  advice: DeckAdvice[];
  entries: DeckEntry[];
  count: number;
  isLegal: boolean;
} {
  const deck = {
    id: state.deckId ?? "",
    name: state.name,
    cards: state.cardIds,
    energyTypes: state.energyTypes,
  };
  const getCard = (id: string) => {
    const card = catalog.get(id);
    return card ? toDeckCard(card) : null;
  };
  const violations = validateDeck(deck, getCard);
  const advice = adviseDeck(deck, getCard);

  // One entry per distinct card id, in first-added order, with its copy count.
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const id of state.cardIds) {
    if (!counts.has(id)) {
      order.push(id);
    }
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const entries: DeckEntry[] = [];
  for (const id of order) {
    const card = catalog.get(id);
    if (card !== undefined) {
      entries.push({ card, count: counts.get(id) ?? 0 });
    }
  }

  return {
    violations,
    advice,
    entries,
    count: state.cardIds.length,
    isLegal: violations.length === 0,
  };
}
