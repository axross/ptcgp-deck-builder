import { describe, expect, it } from "vitest";
import { deriveRarityOptions, deriveSetOptions, toCardTileView } from "./card-view";
import { getAllCards, getCard } from "./catalog";
import type { Card } from "./schema";

function fixture(id: string): Card {
  const card = getCard(id);
  if (card === null) {
    throw new Error(`Test fixture card "${id}" is missing from the catalog.`);
  }
  return card;
}

describe("toCardTileView()", () => {
  it("maps a Pokémon card to its tile view", () => {
    expect(toCardTileView(fixture("A1-002"))).toEqual({
      id: "A1-002",
      name: "Ivysaur",
      imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_002_EN.webp",
      typeLabel: "Grass",
      kindLabel: "Stage 1",
      hp: 90,
      rarityLabel: "Uncommon",
    });
  });

  it("maps a Trainer card with no type or HP", () => {
    const view = toCardTileView(fixture("A1-219")); // Erika, Supporter
    expect(view).toMatchObject({
      id: "A1-219",
      name: "Erika",
      typeLabel: "Trainer",
      kindLabel: "Supporter",
      hp: null,
    });
  });
});

describe("deriveRarityOptions()", () => {
  it("lists the catalog's rarities in canonical tier order", () => {
    expect(deriveRarityOptions(getAllCards())).toEqual([
      { code: "C", label: "Common" },
      { code: "U", label: "Uncommon" },
      { code: "R", label: "Rare" },
      { code: "RR", label: "Double Rare" },
      { code: "AR", label: "Art Rare" },
      { code: "SR", label: "Super Rare" },
      { code: "SAR", label: "Special Art Rare" },
      { code: "IR", label: "Immersive Rare" },
      { code: "S", label: "Shiny" },
      { code: "SSR", label: "Shiny Super Rare" },
      { code: "CR", label: "Crown Rare" },
    ]);
  });

  it("returns each rarity once", () => {
    const options = deriveRarityOptions(getAllCards());
    const codes = options.map((option) => option.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("deriveSetOptions()", () => {
  it("lists the seeded sets, labelled from the registry", () => {
    // One option per seeded set, in registry order, labelled from the registry.
    expect(deriveSetOptions(getAllCards())).toEqual([
      { code: "A1", label: "Genetic Apex (A1)" },
      { code: "A1a", label: "Mythical Island (A1a)" },
      { code: "A2", label: "Space-Time Smackdown (A2)" },
      { code: "A2a", label: "Triumphant Light (A2a)" },
      { code: "A2b", label: "Shining Revelry (A2b)" },
      { code: "A3", label: "Celestial Guardians (A3)" },
      { code: "A3a", label: "Extradimensional Crisis (A3a)" },
      { code: "A3b", label: "Eevee Grove (A3b)" },
      { code: "A4", label: "Wisdom of Sea and Sky (A4)" },
      { code: "A4a", label: "Secluded Springs (A4a)" },
    ]);
  });

  it("orders sets chronologically and omits sets with no cards", () => {
    const a1 = fixture("A1-001");
    // Synthesize a card from a later set to prove ordering and presence-gating
    // without seeding real data.
    const b1 = {
      ...a1,
      id: "B1-001",
      set: { code: "B1", name: "Mega Rising", nameJa: "メガライジング" },
    };

    expect(deriveSetOptions([b1, a1])).toEqual([
      { code: "A1", label: "Genetic Apex (A1)" },
      { code: "B1", label: "Mega Rising (B1)" },
    ]);
  });
});
