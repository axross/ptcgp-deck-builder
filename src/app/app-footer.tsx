import styles from "./app-footer.module.css";

/**
 * The app shell footer: a site-wide legal disclaimer clarifying that this is an
 * unofficial fan project and that the Pokémon names, card names, and images it
 * displays are the intellectual property of their respective owners. Rendered by
 * the root layout at the bottom of every route. A server component — static
 * content with no interactivity.
 */
export function AppFooter() {
  return (
    <footer className={styles.footer} data-testid="app-footer">
      <div className={styles.inner}>
        <p className={styles.text}>
          PTCGP Deck Builder is an unofficial, fan-made project and is not affiliated with,
          endorsed, or sponsored by Nintendo, The Pokémon Company, Creatures Inc., GAME FREAK inc.,
          or DeNA Co., Ltd. Pokémon and Pokémon Trading Card Game Pocket, including all card names
          and images, are trademarks and © of their respective owners. Card images are provided by
          Limitless TCG.
        </p>
      </div>
    </footer>
  );
}
