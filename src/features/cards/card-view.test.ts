import { describe, expect, it } from "vitest";
import {
  cardKindLabel,
  deriveKindOptions,
  deriveRarityOptions,
  deriveSetOptions,
  toCardTileView,
} from "./card-view";
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
      type: "Grass",
      kind: "Stage1",
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
      type: null,
      kind: "Supporter",
      typeLabel: "Trainer",
      kindLabel: "Supporter",
      hp: null,
    });
  });
});

describe("cardKindLabel()", () => {
  it("renders a Trainer subtype in display form", () => {
    const erika = fixture("A1-219"); // Supporter
    if (erika.category !== "Trainer") {
      throw new Error("Test fixture A1-219 is expected to be a Trainer card.");
    }
    // Synthesize a PokemonTool Trainer: the display form ("Pokémon Tool") must
    // not echo the raw enum value.
    const tool: Card = { ...erika, trainer: { ...erika.trainer, subtype: "PokemonTool" } };

    expect(cardKindLabel(erika)).toBe("Supporter");
    expect(cardKindLabel(tool)).toBe("Pokémon Tool");
  });
});

describe("deriveKindOptions()", () => {
  it("lists the catalog's kinds in canonical order without unseeded kinds", () => {
    expect(deriveKindOptions(getAllCards())).toEqual([
      { value: "Basic", label: "Basic" },
      { value: "Stage1", label: "Stage 1" },
      { value: "Stage2", label: "Stage 2" },
      { value: "Supporter", label: "Supporter" },
      { value: "Item", label: "Item" },
      { value: "PokemonTool", label: "Pokémon Tool" },
      { value: "Stadium", label: "Stadium" },
    ]);
  });

  it("omits kinds absent from the given cards", () => {
    const cards = [fixture("A1-001"), fixture("A1-219")]; // Basic + Supporter
    expect(deriveKindOptions(cards)).toEqual([
      { value: "Basic", label: "Basic" },
      { value: "Supporter", label: "Supporter" },
    ]);
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
      { code: "S", label: "Shiny" },
      { code: "SR", label: "Super Rare" },
      { code: "SAR", label: "Special Art Rare" },
      { code: "SSR", label: "Shiny Super Rare" },
      { code: "IR", label: "Immersive Rare" },
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
      { code: "B1", label: "Mega Rising (B1)" },
      { code: "B1a", label: "Crimson Blaze (B1a)" },
      { code: "B2", label: "Fantastical Parade (B2)" },
      { code: "B2a", label: "Paldean Wonders (B2a)" },
      { code: "B2b", label: "Mega Shine (B2b)" },
      { code: "B3", label: "Pulsing Aura (B3)" },
      { code: "B3a", label: "Paradox Drive (B3a)" },
      { code: "B3b", label: "Everyday Wonders (B3b)" },
    ]);
  });

  it("orders sets chronologically and omits sets with no cards", () => {
    const a1 = fixture("A1-001");
    // Synthesize a card from a later set to prove ordering and presence-gating
    // without seeding real data.
    const b1 = { ...a1, id: "B1-001", setCode: "B1" as const };

    expect(deriveSetOptions([b1, a1])).toEqual([
      { code: "A1", label: "Genetic Apex (A1)" },
      { code: "B1", label: "Mega Rising (B1)" },
    ]);
  });
});
