// Shared, pure ingestion logic for the set-data fetch pipeline: transform a
// source card record into the repository's card-data shape, validate the result
// against the authoritative `cardSchema`, and serialize a set deterministically.
//
// This module holds NO network or filesystem I/O so it can be unit-tested with
// no network (see set-ingestion.test.mjs). The CLIs that do I/O — the fetcher
// (fetch-set-data.mjs) and the standalone validator (validate-set-data.mjs) —
// import these functions.
//
// It runs under plain `node` (Node's default TypeScript type-stripping lets an
// .mjs import the .ts schema) and under Vitest, so `cardSchema` stays the single
// source of truth for card validity across the app and this tool.
import { z } from "zod";
import { cardSchema } from "../src/features/cards/schema.ts";

/** Provenance stamped on every card this pipeline emits. */
export const SOURCE_PROVIDER = "dotgg.gg";

/**
 * The source card-record shape this pipeline expects (the normalized dotgg.gg
 * card database record, English-only). The concrete dotgg endpoint and its raw
 * field names are confirmed on the first run in a network-enabled environment
 * and recorded in the ptcgp-domain skill's card-data reference; the network
 * adapter in fetch-set-data.mjs maps dotgg's response into this contract, and
 * everything downstream (transform → validate → serialize) is tested against
 * it. A source-format drift surfaces here as a clear parse error naming the
 * offending record rather than a malformed emitted card.
 *
 * Rarity arrives as the full `{ symbol, code, label }` tuple so a set that
 * introduces a new tier (e.g. the A2b Shiny codes) flows through untouched and
 * is caught downstream by `cardSchema`, which is the intended trigger to extend
 * the rarity enum.
 */
const localizedSource = z.object({ en: z.string(), ja: z.string().nullable().default(null) });

const sourceAttackSchema = z.object({
  name: z.union([z.string(), localizedSource]),
  cost: z.array(z.string()).default([]),
  damage: z.number().int().nullable().default(null),
  damageSuffix: z.enum(["+", "×"]).nullable().default(null),
  text: z.string().nullable().default(null),
});

const sourceAbilitySchema = z.object({
  name: z.union([z.string(), localizedSource]),
  text: z.string(),
});

const sourcePokemonSchema = z.object({
  type: z.string(),
  hp: z.number().int(),
  stage: z.string(),
  evolvesFrom: z.string().nullable().default(null),
  ruleBox: z.string().default("None"),
  isBaby: z.boolean().default(false),
  classification: z.string().nullable().default(null),
  // Passed through verbatim: the source encodes "no weakness" as "none", which
  // `cardSchema` normalizes to null on read.
  weakness: z.string().nullable().default(null),
  retreatCost: z.number().int().min(0),
  abilities: z.array(sourceAbilitySchema).default([]),
  attacks: z.array(sourceAttackSchema).default([]),
});

const sourceTrainerSchema = z.object({
  subtype: z.string(),
  text: z.string(),
});

export const sourceCardSchema = z
  .object({
    slug: z.string(),
    setCode: z.string(),
    number: z.number().int().positive(),
    name: z.union([z.string(), localizedSource]),
    rarity: z.object({ symbol: z.string(), code: z.string(), label: z.string() }),
    category: z.enum(["Pokemon", "Trainer"]),
    illustrator: z.string().nullable().default(null),
    boosterPacks: z.array(z.string()).nullable().default(null),
    flavorText: z.string().nullable().default(null),
    shop: z
      .object({
        packPoints: z.number().int().min(0).nullable().default(null),
        dupeShinedust: z.number().int().min(0).nullable().default(null),
      })
      .default({ packPoints: null, dupeShinedust: null }),
    pokemon: sourcePokemonSchema.nullable().default(null),
    trainer: sourceTrainerSchema.nullable().default(null),
  })
  .strict();

function localized(value) {
  return typeof value === "string" ? { en: value, ja: null } : { en: value.en, ja: value.ja };
}

/**
 * Transforms one source record into a card-data object with keys in the
 * repository's canonical order (so the serializer output diffs cleanly). Game
 * text is copied from the source verbatim — never paraphrased.
 *
 * @param {unknown} record - one source card record (validated here)
 * @param {{ name: string, nameJa: string }} set - the set's registry row,
 *   supplying the set name (never hardcoded) and JP name
 * @param {number} setSize - the set's total card count (from the registry)
 * @returns the canonical card-data object
 */
export function transformSourceCard(record, set, setSize) {
  const source = sourceCardSchema.parse(record);

  const pokemon =
    source.category === "Pokemon" && source.pokemon !== null
      ? {
          type: source.pokemon.type,
          hp: source.pokemon.hp,
          stage: source.pokemon.stage,
          evolvesFrom: source.pokemon.evolvesFrom,
          ruleBox: source.pokemon.ruleBox,
          isBaby: source.pokemon.isBaby,
          classification: source.pokemon.classification,
          weakness: source.pokemon.weakness,
          retreatCost: source.pokemon.retreatCost,
          abilities: source.pokemon.abilities.map((ability) => ({
            name: localized(ability.name),
            text: ability.text,
          })),
          attacks: source.pokemon.attacks.map((attack) => ({
            name: localized(attack.name),
            cost: attack.cost,
            damage: attack.damage,
            damageSuffix: attack.damageSuffix,
            text: attack.text,
          })),
        }
      : null;

  const trainer =
    source.category === "Trainer" && source.trainer !== null
      ? { subtype: source.trainer.subtype, text: source.trainer.text }
      : null;

  return {
    // Card ids are zero-padded to three digits ("A1-001"), matching the seeded
    // data and the image-URL convention; the source slug keeps the raw number.
    id: `${source.setCode}-${String(source.number).padStart(3, "0")}`,
    set: { code: source.setCode, name: set.name, nameJa: set.nameJa },
    number: source.number,
    setSize,
    name: localized(source.name),
    rarity: { symbol: source.rarity.symbol, code: source.rarity.code, label: source.rarity.label },
    category: source.category,
    pokemon,
    trainer,
    illustrator: source.illustrator,
    boosterPacks: source.boosterPacks,
    flavorText: source.flavorText,
    shop: { packPoints: source.shop.packPoints, dupeShinedust: source.shop.dupeShinedust },
    source: { provider: SOURCE_PROVIDER, slug: source.slug },
  };
}

/**
 * Validates every card against the authoritative `cardSchema`.
 *
 * @param {readonly unknown[]} cards
 * @returns {{ ok: boolean, errors: { id: string, violations: string[] }[] }}
 *   `ok` is true when all cards pass; otherwise `errors` names each failing card
 *   id and its schema violations (path + message).
 */
export function validateCards(cards) {
  const errors = [];
  cards.forEach((card, index) => {
    const result = cardSchema.safeParse(card);
    if (!result.success) {
      const id =
        card !== null && typeof card === "object" && typeof card.id === "string"
          ? card.id
          : `#${index}`;
      const violations = result.error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path === "" ? issue.message : `${path}: ${issue.message}`;
      });
      errors.push({ id, violations });
    }
  });
  return { ok: errors.length === 0, errors };
}

const CANONICAL_ID_PATTERN = /^([A-Za-z0-9]+)-(\d+)$/;

/** Returns cards sorted by numeric card number, so emitted files are stable. */
export function sortCardsByNumber(cards) {
  return [...cards].sort((a, b) => {
    const an = CANONICAL_ID_PATTERN.exec(a.id);
    const bn = CANONICAL_ID_PATTERN.exec(b.id);
    return Number(an?.[2] ?? 0) - Number(bn?.[2] ?? 0);
  });
}

function isPrimitive(value) {
  return value === null || typeof value !== "object";
}

/**
 * Deterministic JSON serializer matching the checked-in card-data format:
 * two-space indentation, object keys in insertion order (the transform builds
 * them canonically), and arrays of primitives kept inline (`["Grass", ...]`)
 * while arrays of objects expand one per line. Same input always yields
 * byte-identical output, so re-fetching a set diffs cleanly.
 */
function stringify(value, depth) {
  if (isPrimitive(value)) {
    return JSON.stringify(value);
  }
  const pad = "  ".repeat(depth);
  const padInner = "  ".repeat(depth + 1);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    if (value.every(isPrimitive)) {
      return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    }
    const items = value.map((item) => `${padInner}${stringify(item, depth + 1)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return "{}";
  }
  const entries = keys.map(
    (key) => `${padInner}${JSON.stringify(key)}: ${stringify(value[key], depth + 1)}`,
  );
  return `{\n${entries.join(",\n")}\n${pad}}`;
}

/**
 * Serializes a set's cards to the canonical card-data JSON string (with a
 * trailing newline), sorted by card number.
 */
export function serializeCards(cards) {
  return `${stringify(sortCardsByNumber(cards), 0)}\n`;
}

/**
 * The data filename for a set, e.g. `genetic-apex-a1.json`. Kebab-cases the
 * English name and appends the lowercased code, matching the seeded A1 file.
 */
export function setDataFilename(name, code) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}-${code.toLowerCase()}.json`;
}
