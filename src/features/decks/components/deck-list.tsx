"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import type { DeckBuilderCard } from "../deck-card";
import {
  createDeckListStore,
  type DeckListStore,
  type DeckSummary,
  summarizeDeck,
} from "../deck-list-store";
import { DECK_SIZE } from "../deck-rules";
import type { Deck } from "../schema";
import styles from "./deck-list.module.css";

/**
 * `/decks`: the saved-deck list. Decks live in the browser, so this client
 * component reads and deletes them through the deck-list store (over the #4
 * storage envelope); the server route supplies only the catalog projection the
 * legality summary needs. Each deck card opens its editor; deletion is a
 * separated, confirmed action so it can't be hit by accident.
 */

type DeckListProps = {
  catalog: DeckBuilderCard[];
};

export function DeckList({ catalog }: DeckListProps) {
  const storeRef = useRef<DeckListStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createDeckListStore({ getStorage: () => window.localStorage });
  }
  const store = storeRef.current;

  const decks = useStore(store, (state) => state.decks);
  const loaded = useStore(store, (state) => state.loaded);
  const deleteResult = useStore(store, (state) => state.deleteResult);
  const load = useStore(store, (state) => state.load);
  const deleteDeck = useStore(store, (state) => state.deleteDeck);

  // Decks are read from localStorage, which only exists on the client; loading
  // in an effect keeps the server and first client render identical (both the
  // pre-loaded placeholder) so hydration never mismatches.
  useEffect(() => {
    load();
  }, [load]);

  const catalogById = useMemo(() => new Map(catalog.map((card) => [card.id, card])), [catalog]);
  const summaries = useMemo<DeckSummary[]>(
    () => decks.map((deck) => summarizeDeck(deck, catalogById)),
    [decks, catalogById],
  );

  const [pendingDelete, setPendingDelete] = useState<Deck | null>(null);

  function confirmDelete() {
    if (pendingDelete === null) {
      return;
    }
    // Close the dialog regardless: on success the deck leaves the list, on a
    // rejected write the list is untouched and the error banner surfaces below.
    deleteDeck(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <main className={styles.main} data-testid="decks-page">
      <header className={styles.header}>
        <h1 className={styles.heading}>Decks</h1>
        <Link className={styles.newDeck} href="/decks/new" data-testid="decks-new-link">
          New deck
        </Link>
      </header>

      {deleteResult.status === "error" ? (
        <p className={styles.deleteError} data-testid="decks-delete-error" role="alert">
          {deleteResult.message}
        </p>
      ) : null}

      {!loaded ? (
        <p className={styles.loading} data-testid="decks-loading">
          Loading your decks…
        </p>
      ) : summaries.length === 0 ? (
        <p className={styles.empty} data-testid="decks-empty">
          No decks yet — build your first one.
        </p>
      ) : (
        <ul className={styles.grid} data-testid="decks-list">
          {summaries.map((summary) => (
            <DeckSummaryCard
              key={summary.deck.id}
              summary={summary}
              onRequestDelete={() => setPendingDelete(summary.deck)}
            />
          ))}
        </ul>
      )}

      {pendingDelete !== null ? (
        <DeckDeleteDialog
          deck={pendingDelete}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </main>
  );
}

type DeckSummaryCardProps = {
  summary: DeckSummary;
  onRequestDelete: () => void;
};

function DeckSummaryCard({ summary, onRequestDelete }: DeckSummaryCardProps) {
  const { deck, cardCount, energyTypes, isLegal } = summary;
  const displayName = deck.name.trim() || "Untitled deck";

  return (
    <li className={styles.card} data-testid="deck-summary" data-deck-id={deck.id}>
      {/* Stretched link: the whole card opens the editor while the delete
          button (relative, above it) stays a separate, non-nested target. */}
      <Link
        className={styles.cardLink}
        href={`/decks/${deck.id}/edit`}
        data-testid="deck-summary-open"
      >
        <span className={styles.cardName}>{displayName}</span>
      </Link>

      <p className={styles.cardMeta}>
        <span data-testid="deck-summary-count">
          {cardCount} / {DECK_SIZE} cards
        </span>{" "}
        ·{" "}
        <span className={styles.legality} data-testid="deck-summary-legality" data-legal={isLegal}>
          {isLegal ? "✓ Legal" : "! Incomplete"}
        </span>
      </p>

      {energyTypes.length > 0 ? (
        <ul
          className={styles.energyList}
          data-testid="deck-summary-energy"
          aria-label="Energy Zone"
        >
          {energyTypes.map((type) => (
            <li key={type} className={styles.energyChip}>
              {type}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.energyEmpty} data-testid="deck-summary-energy">
          No energy registered
        </p>
      )}

      <button
        type="button"
        className={styles.deleteButton}
        data-testid="deck-summary-delete"
        onClick={onRequestDelete}
        aria-label={`Delete ${displayName}`}
      >
        Delete
      </button>
    </li>
  );
}

type DeckDeleteDialogProps = {
  deck: Deck;
  onConfirm: () => void;
  onCancel: () => void;
};

function DeckDeleteDialog({ deck, onConfirm, onCancel }: DeckDeleteDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const displayName = deck.name.trim() || "Untitled deck";

  // showModal() gives native focus management (focus moves into the dialog and
  // is trapped) and keyboard operability (Escape fires `cancel`). The dialog is
  // only rendered while a delete is pending, so on unmount return focus to the
  // trigger (unless it's gone — the deck's card was just removed).
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      if (trigger?.isConnected) {
        trigger.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-testid="deck-delete-dialog"
      aria-labelledby="deck-delete-title"
      onCancel={onCancel}
    >
      <h2 id="deck-delete-title" className={styles.dialogTitle}>
        Delete this deck?
      </h2>
      <p className={styles.dialogBody}>
        <strong>“{displayName}”</strong> will be permanently removed from this browser. This can’t
        be undone.
      </p>
      <div className={styles.dialogActions}>
        <button
          type="button"
          className={styles.dialogCancel}
          data-testid="deck-delete-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.dialogConfirm}
          data-testid="deck-delete-confirm"
          onClick={onConfirm}
        >
          Delete
        </button>
      </div>
    </dialog>
  );
}
