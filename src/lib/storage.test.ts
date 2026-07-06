import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readStorageItem, writeStorageItem } from "./storage";

function createFakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const schema = z.object({ name: z.string(), count: z.number() });

describe("readStorageItem", () => {
  it("returns the parsed value when the stored JSON matches the schema", () => {
    const storage = createFakeStorage({
      decks: JSON.stringify({ name: "Starter", count: 20 }),
    });

    expect(readStorageItem(storage, "decks", schema)).toEqual({
      name: "Starter",
      count: 20,
    });
  });

  it("returns null when the key is absent", () => {
    expect(readStorageItem(createFakeStorage(), "decks", schema)).toBeNull();
  });

  it("returns null when the stored value is not valid JSON", () => {
    const storage = createFakeStorage({ decks: "{not json" });

    expect(readStorageItem(storage, "decks", schema)).toBeNull();
  });

  it("returns null when the stored JSON does not match the schema", () => {
    const storage = createFakeStorage({
      decks: JSON.stringify({ name: "Starter", count: "twenty" }),
    });

    expect(readStorageItem(storage, "decks", schema)).toBeNull();
  });
});

describe("writeStorageItem", () => {
  it("stores the value as JSON readable by readStorageItem", () => {
    const storage = createFakeStorage();

    writeStorageItem(storage, "decks", { name: "Starter", count: 20 });

    expect(readStorageItem(storage, "decks", schema)).toEqual({
      name: "Starter",
      count: 20,
    });
  });
});
