import { z } from "zod";
import { energyTypeSchema } from "@/features/cards/schema";

/**
 * Energy types a deck can register for its Energy Zone. Colorless is a
 * wildcard cost (never generated) and Dragon has no Energy of its own —
 * Dragon decks register the types their attacks actually cost.
 */
export const registrableEnergyTypes = [
  "Grass",
  "Fire",
  "Water",
  "Lightning",
  "Psychic",
  "Fighting",
  "Darkness",
  "Metal",
] as const;

export const registrableEnergyTypeSchema = energyTypeSchema.extract(registrableEnergyTypes);

export type RegistrableEnergyType = z.infer<typeof registrableEnergyTypeSchema>;

/**
 * A deck as the visitor builds and saves it. `cards` holds card ids
 * (e.g. "A1-001") including duplicates — one entry per copy.
 */
export const deckSchema = z.object({
  id: z.string(),
  name: z.string(),
  cards: z.array(z.string()),
  energyTypes: z.array(registrableEnergyTypeSchema),
});

export type Deck = z.infer<typeof deckSchema>;
