import type { CardTileView } from "../card-view";
import styles from "./card-grid.module.css";
import { CardTile } from "./card-tile";

// Eager-load roughly the first two rows on a wide viewport so the top of the
// grid isn't lazy-loaded; the rest lazy-load as they scroll into view.
const PRIORITY_TILE_COUNT = 12;

type CardGridProps = {
  cards: readonly CardTileView[];
};

/**
 * Lays out the already-filtered card view models as a responsive grid of
 * {@link CardTile}s. A server component; the empty state is handled by the
 * route, so an empty grid never renders here.
 */
export function CardGrid({ cards }: CardGridProps) {
  return (
    <ul className={styles.grid} data-testid="card-grid">
      {cards.map((card, index) => (
        <CardTile key={card.id} card={card} priority={index < PRIORITY_TILE_COUNT} />
      ))}
    </ul>
  );
}
