import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title} data-testid="home-title">
        PTCGP Deck Builder
      </h1>
      <p className={styles.tagline}>
        Browse Pokémon TCG Pocket cards and build, validate, and save your decks — right in your
        browser.
      </p>
    </main>
  );
}
