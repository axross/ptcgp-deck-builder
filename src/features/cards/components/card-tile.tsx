import type { CardTileView } from "../card-view";
import { CardImage } from "./card-image";
import { CardKindIcon } from "./card-kind-icon";
import styles from "./card-tile.module.css";
import { EnergyIcon } from "./energy-icon";

type CardTileProps = {
  card: CardTileView;
  /** Eager-load the first rows so the top of the grid isn't lazy-loaded. */
  priority?: boolean;
};

/**
 * Renders one catalog card as a grid tile: artwork (or a data-driven fallback)
 * plus name, rarity, and a type/kind badge. A `role="listitem"` div rather
 * than an `li` because the virtualized grid positions rows absolutely, which
 * precludes a plain `ul`/`li` structure.
 */
export function CardTile({ card, priority }: CardTileProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: the virtualized grid's list role lives on a div (its rows preclude `ul`/`li`), so the item role does too.
    <div role="listitem" className={styles.tile} data-testid="card-tile" data-card-id={card.id}>
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
          {/* Pokémon show their energy type; Trainers their subtype pictogram,
              so the badge name matches the drawn shape. */}
          <span
            className={styles.type}
            data-testid="card-tile-type"
            title={card.type !== null ? card.typeLabel : card.kindLabel}
          >
            {card.type !== null ? (
              <EnergyIcon type={card.type} />
            ) : (
              <CardKindIcon kind={card.kind} />
            )}
            <span className={styles.srOnly}>
              {card.type !== null ? card.typeLabel : card.kindLabel}
            </span>
          </span>
          <span className={styles.rarity} data-testid="card-tile-rarity">
            {card.rarityLabel}
          </span>
        </span>
      </div>
    </div>
  );
}
