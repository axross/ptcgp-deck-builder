import type { CardTileView } from "../card-view";
import { CardImage } from "./card-image";
import styles from "./card-tile.module.css";

/**
 * One card in the browse grid: artwork (or fallback) plus name, rarity, and a
 * type/kind badge. A server component — only the image swap-on-error is client
 * (see {@link CardImage}).
 */

type CardTileProps = {
  card: CardTileView;
  /** Eager-load the first rows so the top of the grid isn't lazy-loaded. */
  priority?: boolean;
};

export function CardTile({ card, priority }: CardTileProps) {
  return (
    <li className={styles.tile} data-testid="card-tile" data-card-id={card.id}>
      <CardImage
        src={card.imageUrl}
        alt={card.name}
        priority={priority}
        fallback={{
          name: card.name,
          typeLabel: card.typeLabel,
          kindLabel: card.kindLabel,
          hp: card.hp,
        }}
      />
      <div className={styles.body}>
        <span className={styles.name} data-testid="card-tile-name">
          {card.name}
        </span>
        <span className={styles.meta}>
          <span className={styles.type} data-testid="card-tile-type">
            {card.typeLabel}
          </span>
          <span className={styles.rarity} data-testid="card-tile-rarity">
            {card.rarityLabel}
          </span>
        </span>
      </div>
    </li>
  );
}
