import Link from "next/link";
import styles from "./page.module.css";

/** The landing page: the app name, a one-line tagline, and a CTA into `/cards`. */
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
      <Link className={styles.cta} href="/cards" data-testid="home-browse-cards">
        Browse cards
      </Link>
    </main>
  );
}
