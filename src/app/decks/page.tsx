import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Decks",
  description: "Build, validate, and save Pokémon TCG Pocket decks.",
};

/**
 * `/decks`: the entry point into the deck editor. A saved-deck list is a later
 * milestone; for now this offers the path to build a new deck.
 */
export default function DecksPage() {
  return (
    <main className={styles.main} data-testid="decks-page">
      <h1 className={styles.heading}>Decks</h1>
      <p className={styles.body}>
        Build a 20-card deck from the catalog and save it in this browser.
      </p>
      <Link className={styles.newDeck} href="/decks/new" data-testid="decks-new-link">
        Build a new deck
      </Link>
    </main>
  );
}
