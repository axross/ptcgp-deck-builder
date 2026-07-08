import { describe, expect, it } from "vitest";
import { getRarity } from "./rarity-registry";
import { rarityCodes } from "./schema";

describe("getRarity()", () => {
  it("resolves a diamond-tier and a star-tier code to symbol and label", () => {
    expect(getRarity("C")).toEqual({ symbol: "◇", label: "Common" });
    expect(getRarity("AR")).toEqual({ symbol: "☆", label: "Art Rare" });
  });

  it("resolves the Shiny tiers introduced in A2b", () => {
    expect(getRarity("S")).toEqual({ symbol: "✸", label: "Shiny" });
    expect(getRarity("SSR")).toEqual({ symbol: "✸✸", label: "Shiny Super Rare" });
  });

  it("keeps SR and SAR distinct tiers despite the shared ☆☆ symbol", () => {
    expect(getRarity("SR")).toEqual({ symbol: "☆☆", label: "Super Rare" });
    expect(getRarity("SAR")).toEqual({ symbol: "☆☆", label: "Special Art Rare" });
  });

  it("gives every code in the canonical order a distinct label", () => {
    const labels = rarityCodes.map((code) => getRarity(code).label);

    expect(labels).toHaveLength(rarityCodes.length);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
