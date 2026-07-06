import { z } from "zod";

/**
 * Zod schemas for the PTCGP card model, following the card-data reference in
 * the ptcgp-domain skill (.claude/skills/ptcgp-domain/references/card-data.md).
 * The dataset ships in the repo, so a parse failure here means the data or the
 * schema is wrong — callers treat it as a defect, not user input.
 */

export const energyTypes = [
  "Grass",
  "Fire",
  "Water",
  "Lightning",
  "Psychic",
  "Fighting",
  "Darkness",
  "Metal",
  "Dragon",
  "Colorless",
] as const;

export const energyTypeSchema = z.enum(energyTypes);

export type EnergyType = z.infer<typeof energyTypeSchema>;

export const raritySchema = z.object({
  symbol: z.string(),
  // Extend when a set introduces new tiers (e.g. the Shiny tiers from A2b on).
  code: z.enum(["C", "U", "R", "RR", "AR", "SR", "SAR", "IR", "CR"]),
  label: z.string(),
});

const localizedNameSchema = z.object({
  en: z.string(),
  ja: z.string().nullable(),
});

const attackSchema = z.object({
  name: localizedNameSchema,
  cost: z.array(energyTypeSchema),
  damage: z.number().int().nullable(),
  damageSuffix: z.enum(["+", "×"]).nullable(),
  text: z.string().nullable(),
});

const abilitySchema = z.object({
  name: localizedNameSchema,
  text: z.string(),
});

const pokemonSchema = z.object({
  type: energyTypeSchema,
  hp: z.number().int().positive(),
  stage: z.enum(["Basic", "Stage1", "Stage2"]),
  evolvesFrom: z.string().nullable(),
  // Open enumeration; later sets add MegaEx.
  ruleBox: z.enum(["None", "ex", "MegaEx"]),
  isBaby: z.boolean(),
  classification: z.enum(["UltraBeast", "Ancient", "Future"]).nullable(),
  // The source encodes "no weakness" (Dragon Pokémon) as the string "none";
  // normalize it to null so consumers handle a single absent representation.
  weakness: z.union([energyTypeSchema, z.null(), z.literal("none").transform(() => null)]),
  retreatCost: z.number().int().min(0),
  abilities: z.array(abilitySchema),
  attacks: z.array(attackSchema),
});

const trainerSchema = z.object({
  // Open enumeration; A1 fossils appear as Item, later sets add the rest.
  subtype: z.enum(["Supporter", "Item", "PokemonTool", "Stadium", "Fossil"]),
  text: z.string(),
});

const cardBase = {
  id: z.string(),
  set: z.object({
    code: z.string(),
    name: z.string(),
    nameJa: z.string().nullable(),
  }),
  number: z.number().int().positive(),
  setSize: z.number().int().positive(),
  name: localizedNameSchema,
  rarity: raritySchema,
  illustrator: z.string().nullable(),
  boosterPacks: z.array(z.string()).nullable(),
  flavorText: z.string().nullable(),
  // Null when the source does not expose a value (e.g. A1-218 Old Amber).
  shop: z.object({
    packPoints: z.number().int().min(0).nullable(),
    dupeShinedust: z.number().int().min(0).nullable(),
  }),
  source: z.object({
    provider: z.string(),
    slug: z.string(),
  }),
};

export const cardSchema = z.discriminatedUnion("category", [
  z.object({
    ...cardBase,
    category: z.literal("Pokemon"),
    pokemon: pokemonSchema,
    trainer: z.null(),
  }),
  z.object({
    ...cardBase,
    category: z.literal("Trainer"),
    pokemon: z.null(),
    trainer: trainerSchema,
  }),
]);

export type Card = z.infer<typeof cardSchema>;
export type PokemonCard = Extract<Card, { category: "Pokemon" }>;
export type TrainerCard = Extract<Card, { category: "Trainer" }>;
