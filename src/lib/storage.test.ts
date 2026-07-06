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

describe("readStorageItem()", () => {
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

describe("writeStorageItem()", () => {
  it("stores the value as JSON readable by readStorageItem and reports success", () => {
    const storage = createFakeStorage();

    expect(writeStorageItem(storage, "decks", { name: "Starter", count: 20 })).toBe(true);

    expect(readStorageItem(storage, "decks", schema)).toEqual({
      name: "Starter",
      count: 20,
    });
  });

  it("returns false when the store rejects the write (e.g. quota exceeded)", () => {
    const fullStorage = {
      setItem: () => {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      },
    };

    expect(writeStorageItem(fullStorage, "decks", { name: "Starter", count: 20 })).toBe(false);
  });

  it('throws for a non-serializable value instead of storing the string "undefined"', () => {
    expect(() => writeStorageItem(createFakeStorage(), "decks", undefined)).toThrow(TypeError);
  });
});
