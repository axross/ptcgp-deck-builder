import { describe, expect, it } from "vitest";
import { getSet, isKnownSetCode, setCodes, sets } from "./set-registry";

describe("set registry", () => {
  it("lists all 19 published sets from A1 through B3b", () => {
    expect(sets).toHaveLength(19);
    expect(sets[0].code).toBe("A1");
    expect(sets.at(-1)?.code).toBe("B3b");
  });

  it("has a unique code for every set", () => {
    const codes = sets.map((set) => set.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("carries a positive card count and both names for every set", () => {
    for (const set of sets) {
      expect(set.cardCount).toBeGreaterThan(0);
      expect(Number.isInteger(set.cardCount)).toBe(true);
      expect(set.name.length).toBeGreaterThan(0);
      expect(set.nameJa.length).toBeGreaterThan(0);
    }
  });

  it("uses ISO YYYY-MM-DD release dates in chronological order", () => {
    for (const set of sets) {
      expect(set.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const dates = sets.map((set) => set.releaseDate);
    expect([...dates].sort()).toEqual(dates);
  });

  it("matches the expansions reference for anchor sets", () => {
    expect(getSet("A1")).toMatchObject({ name: "Genetic Apex", cardCount: 286 });
    expect(getSet("A2b")).toMatchObject({ name: "Shining Revelry", cardCount: 111 });
    expect(getSet("B3b")).toMatchObject({ name: "Everyday Wonders", cardCount: 106 });
  });

  it("exposes every code through setCodes in registry order", () => {
    expect(setCodes).toEqual(sets.map((set) => set.code));
  });
});

describe("getSet()", () => {
  it("returns null for an unknown or unpublished code", () => {
    expect(getSet("A1")).not.toBeNull();
    expect(getSet("B4")).toBeNull(); // announced but not yet published
    expect(getSet("ZZ")).toBeNull();
  });
});

describe("isKnownSetCode()", () => {
  it("narrows a published code and rejects others", () => {
    expect(isKnownSetCode("A1")).toBe(true);
    expect(isKnownSetCode("B3b")).toBe(true);
    expect(isKnownSetCode("P-A")).toBe(false);
    expect(isKnownSetCode("B4")).toBe(false);
  });
});
