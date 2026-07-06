"use client";

import { createContext, type ReactNode, useContext, useMemo, useRef } from "react";
import { useStore } from "zustand";
import type { DeckBuilderCard } from "./deck-card";
import { createDeckStore, type DeckEditorState, type DeckStore, deckDerived } from "./store";

/**
 * Wires the vanilla deck store into React. The provider builds one store per
 * mount (so navigating between decks starts a fresh session) with the real
 * `window.localStorage` and `crypto.randomUUID`; consumers read it through the
 * selector hooks below.
 */

const DeckStoreContext = createContext<DeckStore | null>(null);

type DeckStoreProviderProps = {
  catalog: readonly DeckBuilderCard[];
  children: ReactNode;
};

export function DeckStoreProvider({ catalog, children }: DeckStoreProviderProps) {
  const storeRef = useRef<DeckStore | null>(null);
  if (storeRef.current === null) {
    const byId = new Map(catalog.map((card) => [card.id, card]));
    storeRef.current = createDeckStore({
      catalog: byId,
      getStorage: () => window.localStorage,
      generateId: () => crypto.randomUUID(),
    });
  }
  return <DeckStoreContext.Provider value={storeRef.current}>{children}</DeckStoreContext.Provider>;
}

function useDeckStoreApi(): DeckStore {
  const store = useContext(DeckStoreContext);
  if (store === null) {
    throw new Error("useDeckStore must be used within a DeckStoreProvider.");
  }
  return store;
}

/** Selects a slice of deck-editor state (re-renders only when the slice changes). */
export function useDeckStore<T>(selector: (state: DeckEditorState) => T): T {
  return useStore(useDeckStoreApi(), selector);
}

/**
 * Legality, advice, and grouped entries for the live deck, memoized per edit.
 * The single place the domain rules are invoked from the client.
 */
export function useDeckDerived() {
  const catalog = useDeckStore((state) => state.catalog);
  const deckId = useDeckStore((state) => state.deckId);
  const name = useDeckStore((state) => state.name);
  const cardIds = useDeckStore((state) => state.cardIds);
  const energyTypes = useDeckStore((state) => state.energyTypes);
  return useMemo(
    () => deckDerived({ deckId, name, cardIds, energyTypes }, catalog),
    [deckId, name, cardIds, energyTypes, catalog],
  );
}
