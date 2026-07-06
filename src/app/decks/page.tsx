import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Decks",
  description: "Build, validate, and save Pokémon TCG Pocket decks.",
};

/**
 * Placeholder `/decks` route for the deck editor milestone. It exists so the
 * header's Decks link resolves instead of 404ing, and is replaced when the deck
 * builder lands.
 */
export default function DecksPage() {
  return (
    <main className={styles.main} data-testid="decks-page">
      <h1 className={styles.heading}>Decks</h1>
      <p className={styles.body}>Deck building is coming soon.</p>
    </main>
  );
}
