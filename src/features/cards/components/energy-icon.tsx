import type { EnergyType } from "../schema";
import styles from "./energy-icon.module.css";

/**
 * Original pictogram paths, one distinct shape per energy type, drawn on a
 * 24×24 grid. Deliberately not the official energy symbols (third-party IP):
 * each shape is a generic object associated with the type (leaf, flame,
 * droplet, …), filled with the type's color token. The eye (Psychic) and nut
 * (Metal) use even-odd subpaths so their holes stay transparent on any
 * background.
 */
const energyIconPaths: Record<EnergyType, string> = {
  Grass: "M20 4C10.5 4 4 10 4 20c10 0 16-6.5 16-16zM6.5 17.5c2-4.5 5-7.5 9-9.5-5 1-8.5 4.5-9 9.5z",
  Fire: "M13 2c.4 3.2-1.1 5-2.7 6.9C8.8 10.7 7 12.6 7 15.4 7 19 9.4 21.5 12.4 21.5c3.4 0 5.6-2.5 5.6-5.8 0-2.7-1.3-4.3-2.4-5.9-.8-1.2-1.6-2.4-1.6-4-1 .9-1.6 2-1.6 3.5 0 1.1.3 2 .3 2.9 0 1-.6 1.7-1.5 1.7s-1.6-.8-1.6-1.9c0-2.5 2.7-4.5 3.4-10z",
  Water: "M12 2.5c3.7 4.8 6.5 8.4 6.5 12a6.5 6.5 0 1 1-13 0c0-3.6 2.8-7.2 6.5-12z",
  Lightning: "M13.5 2 4.5 13.7h5.2L8.5 22l9-11.7h-5.2z",
  Psychic:
    "M12 5c-5.5 0-9.3 4.5-10 7 .7 2.5 4.5 7 10 7s9.3-4.5 10-7c-.7-2.5-4.5-7-10-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z",
  Fighting:
    "M6.5 7.2c.9 0 1.7.7 1.7 1.7V8c0-1 .8-1.7 1.7-1.7 1 0 1.7.7 1.7 1.7v.5c0-1 .8-1.7 1.7-1.7 1 0 1.7.8 1.7 1.7v.6c0-.9.8-1.7 1.7-1.7 1 0 1.7.8 1.7 1.7v5.4c0 3.3-2.7 6-6 6h-1.2a6 6 0 0 1-5.2-3l-2-3.5c-.5-.8-.2-1.8.6-2.3.7-.4 1.7-.2 2.2.5l1 1.4V8.9c0-1 .8-1.7 1.7-1.7z",
  Darkness:
    "M20.5 14.8A9 9 0 0 1 9.2 3.5 9.3 9.3 0 0 0 3 12.3 8.7 8.7 0 0 0 11.7 21c4 0 7.4-2.6 8.8-6.2z",
  Metal: "M12 2.5 20.2 7.3v9.4L12 21.5l-8.2-4.8V7.3zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  Dragon:
    "M4.5 2.5c3.2 4.2 5.2 8.3 6.2 14.5-4-3-6.3-8-6.2-14.5zm7 1.5c2.7 3.5 4.4 7 5.2 12.2-3.4-2.5-5.4-6.7-5.2-12.2zm6.5 2.5c1.9 2.6 3.1 5.2 3.6 9-2.5-1.9-3.9-4.9-3.6-9z",
  Colorless: "m12 2 2.7 6.9 7.3.4-5.7 4.7 1.9 7.1L12 17l-6.2 4.1 1.9-7.1L2 9.3l7.3-.4z",
};

type EnergyIconProps = {
  type: EnergyType;
  className?: string;
};

/**
 * The pictogram for one energy type, colored by its `--color-energy-*` token.
 * Always `aria-hidden`: the consuming control owns the accessible name (an
 * `aria-label`, visible text, or visually hidden text), so the name is never
 * duplicated when the icon sits next to a label.
 */
export function EnergyIcon({ type, className }: EnergyIconProps) {
  const classes = className === undefined ? styles.icon : `${styles.icon} ${className}`;
  return (
    <svg
      className={classes}
      data-energy={type}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={energyIconPaths[type]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
