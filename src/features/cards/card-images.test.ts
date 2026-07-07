import { describe, expect, it } from "vitest";
import { getCardImageUrl } from "./card-images";
import { getCard } from "./catalog";
import type { Card } from "./schema";

function getExistingCard(id: string): Card {
  const card = getCard(id);
  if (card === null) {
    throw new Error(`Test fixture card "${id}" is missing from the catalog.`);
  }
  return card;
}

describe("getCardImageUrl()", () => {
  it("builds the CDN URL from the set code and zero-padded card number", () => {
    expect(getCardImageUrl(getExistingCard("A1-001"))).toBe(
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_001_EN.webp",
    );
  });

  it("does not pad three-digit card numbers", () => {
    expect(getCardImageUrl(getExistingCard("A1-286"))).toBe(
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_286_EN.webp",
    );
  });

  it("resolves images for the earliest and latest newly-seeded sets (A2b, A4a)", () => {
    // Spot-check the acceptance criterion for issue #7 without a network call:
    // the URL is a pure function of set code + card number.
    expect(getCardImageUrl(getExistingCard("A2b-001"))).toBe(
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A2b/A2b_001_EN.webp",
    );
    expect(getCardImageUrl(getExistingCard("A4a-105"))).toBe(
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A4a/A4a_105_EN.webp",
    );
  });
});
