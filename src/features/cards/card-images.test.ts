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
});
