"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./card-image.module.css";

// The Limitless CDN is an unofficial hotlink with no per-URL guarantee
// (ptcgp-domain › card-images), so a failed image renders a data-driven frame
// instead of a broken image. This is the only client component in the grid —
// the surrounding tile chrome stays on the server.

/** The data-driven content shown in place of a card image that failed to load. */
export type CardImageFallback = {
  name: string;
  /** Primary line: the type or "Trainer". */
  typeLabel: string;
  /** Secondary line: the kind (stage/subtype). */
  kindLabel: string;
  /** HP for Pokémon; `null` for Trainers. */
  hp: number | null;
};

type CardImageProps = {
  src: string;
  alt: string;
  /** `true` for the first grid rows so the fold isn't lazy-loaded. */
  priority?: boolean;
  fallback: CardImageFallback;
};

// Portrait ratio of a Pocket card (~245×342); the intrinsic size only fixes the
// aspect ratio — CSS drives the on-screen size so the grid stays stable.
const CARD_WIDTH = 245;
const CARD_HEIGHT = 342;

/**
 * Renders card artwork through `next/image`, swapping to the data-driven
 * {@link CardImageFallback} frame when the image fails to load.
 */
export function CardImage({ src, alt, priority, fallback }: CardImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={styles.fallback}
        data-testid="card-image-fallback"
        role="img"
        aria-label={alt}
      >
        <span className={styles.fallbackName}>{fallback.name}</span>
        <span className={styles.fallbackMeta}>
          {fallback.typeLabel} · {fallback.kindLabel}
        </span>
        {fallback.hp !== null ? <span className={styles.fallbackHp}>{fallback.hp} HP</span> : null}
      </div>
    );
  }

  return (
    <Image
      className={styles.image}
      src={src}
      alt={alt}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      sizes="(max-width: 30rem) 45vw, (max-width: 60rem) 22vw, 12rem"
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
