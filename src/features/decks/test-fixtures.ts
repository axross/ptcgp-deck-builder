/**
 * Shared real-catalog test fixture: a legal, well-built 20-card Fire deck —
 * 2× the Charmander/Growlithe/Ponyta lines plus Magmar ×2, Moltres, and three
 * Supporters. Used by both the deck-rules and deck-advice suites so the two
 * cannot drift apart when the dataset changes.
 */

export const CHARMANDER = "A1-033";
export const CHARMELEON = "A1-034";
export const CHARIZARD = "A1-035";
export const GROWLITHE = "A1-039";
export const ARCANINE = "A1-040";
export const PONYTA = "A1-042";
export const RAPIDASH = "A1-043";
export const MAGMAR = "A1-044";
export const MOLTRES = "A1-046";
export const BLAINE = "A1-221";
export const GIOVANNI = "A1-223";
export const ERIKA = "A1-219";

export const WELL_BUILT_FIRE_DECK_CARDS: string[] = [
  CHARMANDER,
  CHARMANDER,
  CHARMELEON,
  CHARMELEON,
  CHARIZARD,
  CHARIZARD,
  GROWLITHE,
  GROWLITHE,
  ARCANINE,
  ARCANINE,
  PONYTA,
  PONYTA,
  RAPIDASH,
  RAPIDASH,
  MAGMAR,
  MAGMAR,
  MOLTRES,
  BLAINE,
  GIOVANNI,
  ERIKA,
];
