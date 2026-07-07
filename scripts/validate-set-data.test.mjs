import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateCards } from "./set-ingestion.mjs";
import { parseCards } from "./validate-set-data.mjs";

// The standalone validator's fixture: one schema-valid card (Helix Fossil) and
// one deliberately invalid card (an out-of-enum rarity code) as JSONL, matching
// the shape a source dump might arrive in.
const invalidCardsJsonl = readFileSync(
  new URL("./fixtures/invalid-cards.jsonl", import.meta.url),
  "utf8",
);

describe("parseCards()", () => {
  it("parses JSONL into one card object per non-empty line", () => {
    const cards = parseCards(invalidCardsJsonl, "invalid-cards.jsonl");

    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.id)).toEqual(["A1-216", "A1-999"]);
  });

  it("parses a JSON array of cards", () => {
    const cards = parseCards('[{"id": "A1-001"}, {"id": "A1-002"}]', "array.json");

    expect(cards.map((card) => card.id)).toEqual(["A1-001", "A1-002"]);
  });

  it("throws with the offending line number on malformed JSONL", () => {
    expect(() => parseCards('{"id": "A1-001"}\n{ not json', "broken.jsonl")).toThrow(/line 2/);
  });
});

describe("validate-set-data fixture", () => {
  it("accepts the valid card and rejects the invalid one, naming its violation", () => {
    const cards = parseCards(invalidCardsJsonl, "invalid-cards.jsonl");

    const { ok, errors } = validateCards(cards);

    expect(ok).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe("A1-999");
    expect(errors[0].violations.join(" ")).toContain("rarity.code");
  });
});
