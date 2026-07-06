import type { Card } from "./schema";

/**
 * Card artwork is hotlinked from the Limitless TCG Pocket CDN — the community
 * card database that tracks every expansion through the latest release. The
 * URL pattern is `{base}/{setCode}/{setCode}_{number3}_EN.webp`. See
 * ptcgp-domain › card-images for the source decision, caveats, and
 * alternatives; changing provider means changing only this module.
 */
const CARD_IMAGE_BASE_URL = "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket";

/** Returns the full-size English card image URL for a card. */
export function getCardImageUrl(card: Card): string {
  const number = String(card.number).padStart(3, "0");
  return `${CARD_IMAGE_BASE_URL}/${card.set.code}/${card.set.code}_${number}_EN.webp`;
}
