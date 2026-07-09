import type { CardKind } from "../card-filters";
import styles from "./card-kind-icon.module.css";

/**
 * Original pictogram paths, one per card kind, drawn on a 24×24 grid. The
 * Pokémon stages read as an evolution progression (an egg-like base, then one
 * chevron, then two); the Trainer subtypes use literal object shapes (a
 * person, a potion, a wrench, a pennant, a spiral shell). Monochrome by
 * design — they inherit `currentColor` from the surrounding control.
 */
const cardKindIconPaths: Record<CardKind, string> = {
  Basic: "M12 3.5c3.6 0 6.5 3.6 6.5 8a6.5 6.5 0 1 1-13 0c0-4.4 2.9-8 6.5-8z",
  Stage1: "M12 5.5 20 14h-5v4.5H9V14H4z",
  Stage2: "M12 2.5 19 10h-4.4v1.6H9.4V10H5zm0 9L19 19h-4.4v2.5H9.4V19H5z",
  Supporter:
    "M12 3.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 13c4.6 0 7.5 2.6 7.5 6.2v1.3h-15v-1.3C4.5 15.6 7.4 13 12 13z",
  Item: "M10 2.5h4V5l-1 1.2v2.2a6 6 0 0 1 4.5 5.8 5.5 5.5 0 1 1-11 0A6 6 0 0 1 11 8.4V6.2L10 5z",
  PokemonTool:
    "M21.4 18.2 14 10.8c.8-2 .4-4.4-1.3-6C11 3 8.6 2.5 6.6 3.3l3.5 3.5-2.4 2.4-3.5-3.5c-.8 2-.3 4.4 1.4 6.1 1.6 1.7 4 2.1 6 1.3l7.4 7.4c.4.4 1 .4 1.4 0l1-1c.4-.4.4-1 0-1.3z",
  Stadium: "M6 2h2.2v20H6zM8.2 3.5H20l-3.4 4.7L20 12.9H8.2z",
  Fossil:
    "M12 2.5c5.2 0 9.5 4.3 9.5 9.5a6.8 6.8 0 0 1-6.8 6.8 5.4 5.4 0 0 1-5.4-5.4A4.3 4.3 0 0 1 13.6 9a3.4 3.4 0 0 1 3.4 3.4h-2a1.4 1.4 0 0 0-1.4-1.4 2.3 2.3 0 0 0-2.3 2.4 3.4 3.4 0 0 0 3.4 3.4 4.8 4.8 0 0 0 4.8-4.8A7.5 7.5 0 0 0 12 4.5 8.5 8.5 0 0 0 3.5 13c0 4 2.4 7 5.7 8.5H4.8A10.4 10.4 0 0 1 1.5 13C1.5 7.2 6.2 2.5 12 2.5z",
};

type CardKindIconProps = {
  kind: CardKind;
  className?: string;
};

/**
 * The pictogram for one card kind (a Pokémon stage or a Trainer subtype).
 * Always `aria-hidden`: the consuming control owns the accessible name, so
 * the name is never duplicated when the icon sits next to a label.
 */
export function CardKindIcon({ kind, className }: CardKindIconProps) {
  const classes = className === undefined ? styles.icon : `${styles.icon} ${className}`;
  return (
    <svg
      className={classes}
      data-kind={kind}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={cardKindIconPaths[kind]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
