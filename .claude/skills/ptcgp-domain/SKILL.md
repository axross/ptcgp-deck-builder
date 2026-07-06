---
name: ptcgp-domain
description: Apply this skill when working with PTCGP (Pokémon TCG Pocket) domain concepts in this project — card data and its schema, the card catalog, deck-construction rules and deck validation, energy types and the Energy Zone, rarity tiers, expansions/sets, or battle-rule questions that affect the deck builder. Use even when the user only mentions a card, a deck rule, an expansion code (A1, B2, …), energy, rarity, HP/attacks/abilities, or adding a new set's data.
---

# PTCGP Domain

The game knowledge behind the deck builder: what PTCGP cards are, how decks must be constructed, and which expansions exist. Where files *live* is owned by [Project Structure](../project-structure/SKILL.md); this skill owns what the domain data *means* and which rules the code must enforce.

## Reference Documents

Authoritative research documents (compiled mid-2026; PTCGP is a live game — treat fast-moving numeric values as snapshots):

- [overview.md](./references/overview.md) — what the game is; **§2 is the card model**: card kinds, the 10 types, card anatomy, rarity tiers, and the structured card-attribute description the code schema follows.
- [game-rule.md](./references/game-rule.md) — battle rules; **§1 is deck construction**, the rest covers turn structure, the Energy Zone, damage/status, and edge-case rulings.
- [expansions.md](./references/expansions.md) — every set with codes (A1…B4), dates, card counts, packs, and notable cards.
- [card-data.md](./references/card-data.md) — the machine-readable dataset's schema, enumerations, provenance, and quirks.

## Deck-Construction Rules (enforced in code)

`src/features/decks/deck-rules.ts` implements these; `validateDeck()` returns structured violations. Per [game-rule.md §1](./references/game-rule.md):

- A deck is **exactly 20 cards**, only Pokémon and Trainer cards — Energy is not a card; the deck instead **registers 1–3 Energy Zone types** from the 8 generatable types (`registrableEnergyTypes` — Colorless is a wildcard cost, Dragon has no Energy).
- **At most 2 copies per card *name*** — variants share a name, so the limit spans art/rarity variants.
- **At least 1 Basic Pokémon** — fossil Items act as Basics in play but do not satisfy this (they cannot be placed during setup).

**Guidelines:**

- MUST route every deck-legality decision through `validateDeck()` rather than re-implementing a rule at a call site.
- MUST count card copies by English name (`name.en`), never by card id, when enforcing or displaying the copy limit.
- MUST consult [game-rule.md](./references/game-rule.md) before implementing any battle-adjacent behavior (weakness math, status, points) — several rules deliberately differ from the paper TCG.

## Card Data and Schemas

- `src/features/cards/schema.ts` — Zod schemas and enums (types, rarity codes, stages, rule boxes, classifications, trainer subtypes). It is the type-checked form of [card-data.md](./references/card-data.md).
- `src/features/cards/catalog.ts` — validated, cached access to the dataset (`getAllCards()`, `getCard(id)`); it throws on schema mismatch because the data ships with the repo (a defect, not user input).
- `src/features/cards/data/genetic-apex-a1.json` — the A1 dataset (286 cards).

**Guidelines:**

- MUST parse any card data through `cardSchema` before use, and access it via the catalog module, not by importing the JSON directly.
- MUST keep the catalog on the server tier — the dataset is ~370 KB; pass cards/filtered lists to client components as props per [Component Guidelines](../component-guidelines/SKILL.md).
- MUST treat art/rarity variants as distinct catalog entries with identical battle stats; deck logic groups them by name, collection/display logic keeps them separate.
- MUST NOT hand-edit card game text — it is quoted from the sources recorded in each card's `source` field and in [card-data.md](./references/card-data.md).

## Adding a New Expansion's Data

1. Obtain the set's data in the same card-object shape (see [card-data.md](./references/card-data.md)) and add it as `src/features/cards/data/<set-name>-<code>.json`, in card-number order.
2. Extend the enums in `schema.ts` only as the set requires (e.g. Shiny rarity codes from A2b, `MegaEx` from B1, new trainer subtypes) and record the change in [card-data.md](./references/card-data.md).
3. Register the file in `catalog.ts` so `getAllCards()` spans all sets, and extend the catalog test's per-set count assertions.
4. Update [expansions.md](./references/expansions.md) if the set is newer than the document, and note new mechanics that affect deck rules (e.g. a new card class with a different KO point value).

## Data Quirks to Remember

- `weakness: "none"` in the source is normalized to `null` by the schema (Dragon Pokémon).
- `A1-218` (Old Amber) has `null` shop values; `shop` fields are nullable.
- A1's 19 Trainer cards are 16 Supporters (8 names × 2 art variants) and 3 fossil **Items** (Helix/Dome Fossil, Old Amber) — there is no `Fossil` subtype in the A1 data.
- `boosterPacks` is `null` throughout A1 (pack-exclusivity not exposed by the source).
