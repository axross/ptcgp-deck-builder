import { z } from "zod";
import { energyTypeSchema } from "@/features/cards/schema";

/**
 * Energy types a deck can register for its Energy Zone: every generatable
 * type. Colorless is a wildcard cost (never generated) and Dragon has no
 * Energy of its own — Dragon decks register the types their attacks actually
 * cost.
 */
export const registrableEnergyTypeSchema = energyTypeSchema.exclude(["Colorless", "Dragon"]);

export const registrableEnergyTypes = registrableEnergyTypeSchema.options;

/** An energy type the Energy Zone can generate (all types except Colorless and Dragon). */
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

/** A validated saved deck (see {@link deckSchema}). */
export type Deck = z.infer<typeof deckSchema>;
