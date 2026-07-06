import type { CardTileView } from "../card-view";
import styles from "./card-grid.module.css";
import { CardTile } from "./card-tile";

/**
 * The responsive grid of card tiles. A server component: it receives the
 * already-filtered view models and lays them out. The empty state is handled by
 * the route, not here — an empty grid never renders.
 */

// Eager-load roughly the first two rows on a wide viewport so the top of the
// grid isn't lazy-loaded; the rest lazy-load as they scroll into view.
const PRIORITY_TILE_COUNT = 12;

type CardGridProps = {
  cards: readonly CardTileView[];
};

export function CardGrid({ cards }: CardGridProps) {
  return (
    <ul className={styles.grid} data-testid="card-grid">
      {cards.map((card, index) => (
        <CardTile key={card.id} card={card} priority={index < PRIORITY_TILE_COUNT} />
      ))}
    </ul>
  );
}
