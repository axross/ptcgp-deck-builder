"use client";

import { VirtualizedGrid } from "@/components/virtualized-grid";
import type { CardTileView } from "../card-view";
import styles from "./card-grid.module.css";
import { CardTile } from "./card-tile";

// Eager-load roughly the first two rows on a wide viewport so the top of the
// grid isn't lazy-loaded; the rest lazy-load as they scroll into view.
const PRIORITY_TILE_COUNT = 12;

// A tile is the card image (portrait 245:342 at up to ~10.5rem wide) plus the
// name/meta body; the virtualizer replaces this estimate with measured row
// heights after the first paint.
const ESTIMATED_ROW_HEIGHT = 300;

type CardGridProps = {
  cards: readonly CardTileView[];
};

/**
 * Lays out the already-filtered card view models as a responsive, window-
 * virtualized grid of {@link CardTile}s, so the mounted tile count is bounded
 * by the viewport rather than the catalog size. The empty state is handled by
 * the route, so an empty grid never renders here.
 */
export function CardGrid({ cards }: CardGridProps) {
  return (
    <VirtualizedGrid
      items={cards}
      getItemKey={(card) => card.id}
      rowClassName={styles.row}
      estimatedRowHeight={ESTIMATED_ROW_HEIGHT}
      data-testid="card-grid"
      renderItem={(card, index) => <CardTile card={card} priority={index < PRIORITY_TILE_COUNT} />}
    />
  );
}
