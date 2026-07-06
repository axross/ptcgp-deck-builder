"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DeckBuilderCard } from "../deck-card";
import { loadDeck } from "../deck-storage";
import { DeckStoreProvider, useDeckStore } from "../store-context";
import { DeckCardPicker } from "./deck-card-picker";
import styles from "./deck-editor.module.css";
import { DeckPanel } from "./deck-panel";

/**
 * The deck editor surface shared by `/decks/new` and `/decks/[deckId]/edit`:
 * the card picker beside the deck panel. The catalog projection arrives from
 * the server route as props; the editing session lives entirely on the client
 * in the deck store, so filtering and edits never navigate.
 */

type DeckEditorProps = {
  catalog: DeckBuilderCard[];
} & ({ mode: "new" } | { mode: "edit"; deckId: string });

export function DeckEditor(props: DeckEditorProps) {
  return (
    <DeckStoreProvider catalog={props.catalog}>
      <DeckEditorInner {...props} />
    </DeckStoreProvider>
  );
}

type InitStatus = "loading" | "ready" | "not-found";

function DeckEditorInner(props: DeckEditorProps) {
  const { catalog } = props;
  const loadNew = useDeckStore((state) => state.loadNew);
  const loadExisting = useDeckStore((state) => state.loadExisting);
  const [status, setStatus] = useState<InitStatus>(props.mode === "new" ? "ready" : "loading");
  const router = useRouter();

  // Existing decks load client-side from localStorage (the catalog is on the
  // server, decks are in the browser). An unknown/corrupt id shows not-found
  // instead of throwing. New decks start empty. Runs once on mount.
  const deckId = props.mode === "edit" ? props.deckId : null;
  useEffect(() => {
    if (deckId === null) {
      loadNew();
      setStatus("ready");
      return;
    }
    const deck = loadDeck(window.localStorage, deckId);
    if (deck === null) {
      setStatus("not-found");
      return;
    }
    loadExisting(deck);
    setStatus("ready");
  }, [deckId, loadNew, loadExisting]);

  if (status === "loading") {
    return (
      <main className={styles.main} data-testid="deck-editor-loading">
        <p className={styles.loading}>Loading deck…</p>
      </main>
    );
  }

  if (status === "not-found") {
    return (
      <main className={styles.main} data-testid="deck-not-found">
        <h1 className={styles.notFoundHeading}>Deck not found</h1>
        <p className={styles.notFoundBody}>
          This deck isn&rsquo;t saved in this browser. It may have been removed, or saved in a
          different browser.
        </p>
        <Link className={styles.notFoundAction} href="/decks/new" data-testid="deck-not-found-new">
          Build a new deck
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.main} data-testid="deck-editor">
      <div className={styles.layout}>
        <DeckCardPicker catalog={catalog} />
        <DeckPanel
          onSavedNew={(newId) => {
            router.replace(`/decks/${newId}/edit`);
          }}
        />
      </div>
    </main>
  );
}
