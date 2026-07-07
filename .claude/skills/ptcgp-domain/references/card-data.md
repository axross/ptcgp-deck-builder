# PTCGP Card Data

The repository's machine-readable card data lives under
`src/features/cards/data/` — one JSON file per expansion. Genetic Apex (A1) is
the canonical worked example below; the sets seeded on top of it (A1a–A4a) and
their per-set quirks are covered in "Seeded expansions beyond A1". The A1 file,
`src/features/cards/data/genetic-apex-a1.json`, is a JSON **array** (converted
from the upstream JSONL, one object per card) following the card model
described in [`overview.md`](./overview.md) §2. The Zod implementation in
`src/features/cards/schema.ts` is the authoritative, type-checked form of this
schema; this document explains the fields and the source's quirks.

- **Contents:** all **286** cards of the first expansion, **Genetic Apex (A1 /
  最強の遺伝子)**, in card-number order (`#1`–`#286`). 267 Pokémon + 19 Trainer
  cards (16 Supporters — 8 names × 2 art variants — and 3 fossil Items).
- **Sources:** card data from the `dotgg.gg` database; `flavorText` transcribed
  from `pocket.limitlesstcg.com` (fetched 2026-07). Card game text is quoted
  from these sources; each card's `source` field records provenance.

## Scope notes and data quirks

- The upstream source also lists two out-of-range rows (`#328` Erika, `#334`
  Giovanni) under A1; these are promo/reprint entries outside the 286-card set
  and are **excluded**.
- All **art/rarity variants of a card share identical battle stats** — e.g.,
  Charizard ex exists as `◇◇◇◇`, `☆☆`, `☆☆☆`, and `♛` separate entries with
  the same HP/attacks. The deck copy limit counts by **name**, across variants.
- **`weakness: "none"`** — the source encodes "no weakness" (the Dragon-type
  cards `A1-183`–`A1-185`, `A1-244`) as the string `"none"`; the Zod schema
  normalizes it to `null`, so consumers only ever see `EnergyType | null`.
- **`A1-218` (Old Amber)** ships `null` for both `shop.packPoints` and
  `shop.dupeShinedust`; the shop fields are nullable for this reason.
- Some fields are intentionally present but empty in this set (`null`/`false`);
  they are **reserved for extensibility** so the same schema serves later
  expansions (see the last section).
- **B1 (Mega Rising)** is the first seeded B-series set. It debuts the `MegaEx`
  rule box (18 cards; KO worth 3 points battle-side — no deck-rule change) and
  the Shiny `S`/`SSR` rarity tiers. A Mega evolves from its real prior stage
  (`Combusken` → Mega Blaziken ex), and some Megas are Basics (Mega Pinsir ex).
  It carries **no** `Stadium` trainers (that subtype debuts in B2) and no
  `Ancient`/`Future` classification (B3a). dotgg tags B1 card slugs with a `b11`
  prefix (e.g. `b11-36-mega-blaziken-ex`), recorded verbatim in `source.slug`.

## Schema

### Top-level fields (every card)

| Field          | Type           | Notes                                                                                                                                                         |
| -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | string         | Stable key, `"A1-280"`.                                                                                                                                       |
| `set`          | object         | `{ code, name, nameJa }` — e.g., `A1` / Genetic Apex / 最強の遺伝子.                                                                                          |
| `number`       | integer        | Card number within the set (1–286).                                                                                                                           |
| `setSize`      | integer        | Base set size (286).                                                                                                                                          |
| `name`         | object         | `{ en, ja }` — `ja` is `null` here (see reserved fields).                                                                                                     |
| `rarity`       | object         | `{ symbol, code, label }` — see the rarity enum below.                                                                                                        |
| `category`     | string         | `"Pokemon"` or `"Trainer"`.                                                                                                                                   |
| `pokemon`      | object \| null | Present when `category = "Pokemon"`, else `null`.                                                                                                             |
| `trainer`      | object \| null | Present when `category = "Trainer"`, else `null`.                                                                                                             |
| `illustrator`  | string \| null | Art credit.                                                                                                                                                   |
| `boosterPacks` | array \| null  | Which pack(s) yield it (Charizard/Mewtwo/Pikachu). `null` = not in source.                                                                                    |
| `flavorText`   | string \| null | Pokédex-style flavor sentence. Present on non-ex Pokémon (incl. full-art AR and the immersive Mew); `null` for Pokémon ex and Trainer cards, which have none. |
| `shop`         | object         | `{ packPoints, dupeShinedust }` — Pack-Point cost and Shinedust dupe value; both nullable.                                                                    |
| `source`       | object         | `{ provider, slug }` — provenance.                                                                                                                            |

### `pokemon` object

| Field            | Type             | Notes                                                            |
| ---------------- | ---------------- | ---------------------------------------------------------------- |
| `type`           | string           | One of the ten energy types (enum below).                        |
| `hp`             | integer          | Hit points.                                                      |
| `stage`          | string           | `"Basic"`, `"Stage1"`, or `"Stage2"`.                            |
| `evolvesFrom`    | string \| null   | Name of the required lower stage; `null` for Basics.             |
| `ruleBox`        | string           | `"None"` or `"ex"` (open enum — `MegaEx` from B1).               |
| `isBaby`         | boolean          | Baby Pokémon flag (all `false` in A1).                           |
| `classification` | string \| null   | `UltraBeast` / `Ancient` / `Future` / `null` (all `null` in A1). |
| `weakness`       | string \| null   | Energy type that deals +20; `null` if none (Dragon).             |
| `retreatCost`    | integer          | Energy to discard to switch out.                                 |
| `abilities`      | array of Ability | Usually 0 or 1.                                                  |
| `attacks`        | array of Attack  | 0–2.                                                             |

### `trainer` object

| Field     | Type   | Notes                                                                                                   |
| --------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `subtype` | string | `"Supporter"`, `"Item"` (open enum: `PokemonTool`, `Stadium`, `Fossil`). Fossils appear here as `Item`. |
| `text`    | string | Rules text.                                                                                             |

### `Attack` object

| Field          | Type            | Notes                                                                                                 |
| -------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| `name`         | object          | `{ en, ja }`.                                                                                         |
| `cost`         | array of string | Energy types required, e.g., `["Fire","Fire","Colorless","Colorless"]`. Empty array = no Energy cost. |
| `damage`       | integer \| null | Base printed damage; `null` for effect-only attacks.                                                  |
| `damageSuffix` | string \| null  | `"+"` (does more under a condition) or `"×"` (per heads/count); else `null`.                          |
| `text`         | string \| null  | Effect text (energy symbols kept in `{X}` notation).                                                  |

### `Ability` object

| Field  | Type   | Notes         |
| ------ | ------ | ------------- |
| `name` | object | `{ en, ja }`. |
| `text` | string | Effect text.  |

## Enumerations

**Energy types (`type`, `weakness`, `cost` entries):** Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Colorless. (Note: there is no Dragon energy — Dragon attacks cost other types; Colorless costs accept any energy. A deck's Energy Zone registers only the 8 generatable types — see `registrableEnergyTypes` in `src/features/decks/schema.ts`.)

**Rarity (`rarity.code` → `symbol` / `label`):**

| Code  | Symbol | Label            | In A1 |
| ----- | ------ | ---------------- | ----- |
| `C`   | ◇      | Common           | 100   |
| `U`   | ◇◇     | Uncommon         | 69    |
| `R`   | ◇◇◇    | Rare             | 42    |
| `RR`  | ◇◇◇◇   | Double Rare (ex) | 15    |
| `AR`  | ☆      | Art Rare         | 24    |
| `SR`  | ☆☆     | Super Rare       | 23    |
| `SAR` | ☆☆     | Special Art Rare | 6     |
| `IR`  | ☆☆☆    | Immersive Rare   | 4     |
| `CR`  | ♛      | Crown Rare       | 3     |

**Shiny tiers (Shining Revelry / A2b on):** dotgg exposes them as the labels `Shiny` (`✸`) and `Shiny Super Rare` (`✸✸`); they are mapped to the `code` strings **`S`** and **`SSR`** in both `RARITY_BY_LABEL` (`fetch-set-data.mjs`) and the `rarity.code` enum (`schema.ts`). In the pull-rarity ladder (see [overview.md §2.5](./overview.md)) they rank *below* Immersive Rare, not above: common → crown is `…, RR, AR, S, SR, SAR, SSR, IR, CR` — which is the canonical order the `code` enum and the rarity filter follow. They recur in **B1 (Mega Rising)** — 30 `Shiny` + 12 `Shiny Super Rare`.

| Code  | Symbol | Label            | First in |
| ----- | ------ | ---------------- | -------- |
| `S`   | ✸      | Shiny            | A2b      |
| `SSR` | ✸✸     | Shiny Super Rare | A2b      |

**`stage`:** Basic, Stage1, Stage2 · **`ruleBox`:** None, ex · **`trainer.subtype`:** Supporter, Item.

## Reserved / extensible fields

These are modeled now so the identical schema scales to later sets and richer sourcing, even though they are empty for A1:

- `name.ja` and attack/ability `name.ja` — Japanese names (the source is English-only).
- `boosterPacks` — pack-exclusivity, not exposed by the source.
- `pokemon.classification` — `UltraBeast` is populated from A3a (see the seeded-sets quirks below); `Ancient`/`Future` (from B3a) have no dotgg signal yet.
- `pokemon.isBaby` — **not sourced.** No source (dotgg or Limitless) marks Baby Pokémon, and PTCGP does not surface "Baby" as a card mechanic — e.g. A4 Pichu is a plain Basic. The field stays `false` for every seeded card; revisit only if a source ever exposes it.
- `pokemon.ruleBox` and `trainer.subtype` are **open enumerations**: later sets add `MegaEx`, `PokemonTool`, `Stadium`, etc. The Zod enums in `schema.ts` already include the documented future values; extend them when a new mechanic ships.

## Seeded expansions beyond A1 (A1a–A4a, B1–B2a) and their quirks

The catalog seeds every A-series set through A4a and the B-series through B2a; each is one JSON file under `data/`, fetched by the pipeline below and registered in `catalog.ts`. Per-set quirks, in the A1-quirks style:

- **Shiny rarities (A2b, Shining Revelry).** First set with the `✸` / `✸✸` tiers — `code` `S` / `SSR` (see the rarity table above). dotgg labels them `Shiny` and `Shiny Super Rare`.
- **UltraBeast classification (A3a, Extradimensional Crisis).** dotgg has **no classification field**; the only signal is a customization *flair* whose slug carries `ultra-beast`, present on every printing of a UB card and absent on all others. `deriveClassification` in `fetch-set-data.mjs` reads it to set `pokemon.classification = "UltraBeast"` (19 printings / 11 names in A3a). A future `Ancient`/`Future` set will need its own signal.
- **`isBaby` (A4, Wisdom of Sea and Sky).** Despite the physical TCG's Baby mechanic, PTCGP has no Baby card mechanic and no source exposes one; `isBaby` stays `false` (see the reserved-fields note above).
- **A4b (Deluxe Pack: ex) is not yet seeded.** dotgg models it as 379 ordinary numbered cards (no parallel-foil variant data to represent), but 33 of them carry no upstream rarity and would fail `cardSchema`. It is deferred until that upstream data is complete rather than seeded with a placeholder rarity.
- **MegaEx rule box + Shiny tiers (B1, Mega Rising).** First B-series set; see the B1 bullet under "Scope notes and data quirks" above.
- **TCGdex-sourced rarity (B1a Crimson Blaze, B2 Fantastical Parade, B2a Paldean Wonders).** dotgg has **not backfilled rarity** for these sets — every card's dotgg `rarity` is `null` (one B1a card excepted) — but is otherwise complete (HP, attacks, text, images, illustrator, shop). Rarity is therefore sourced from **TCGdex** (`api.tcgdex.net`), consulted by the pipeline only for cards whose dotgg rarity is missing. Card *body* provenance stays dotgg (`source.provider = "dotgg.gg"`, `source.slug` the dotgg slug); rarity provenance for these three sets is TCGdex, recorded here. **`Two Star` imprecision:** TCGdex reports both Super Rare and Special Art Rare as `Two Star` with no field to tell them apart, so the whole `☆☆` tier is labeled **Super Rare** and the SAR alternate-art subset is knowingly not distinguished (B1a 11 / B2 23 / B2a 15 `☆☆` cards). TCGdex *does* keep the Shiny tiers distinct (`One/Two Shiny` vs `One/Two Star`), which an earlier Limitless attempt could not. The pipeline enforces the registry count, so a `Two Star` mislabel never changes the card total.
- **Stadium trainer subtype (B2, Fantastical Parade).** First set with the `Stadium` subtype (e.g. `B2-153` Training Area); `mapTrainerSubtype` in `fetch-set-data.mjs` already handled it. B2a also carries one Stadium.
- **B2b–B3b deferred; B3a `Ancient`/`Future` still unsourced.** TCGdex has not yet ingested B2b, B3, B3a, or B3b (they 404), and dotgg has no rarity for them, so they remain unseeded. `Ancient`/`Future` classifications (debuting in B3a) still have no source and stay `null` until B3a is seedable. B4 (Ruler of the Skies) is unreleased.

## Ingestion pipeline (fetching a set)

Seeding a set is an automated fetch + validate step, not a hand-assembled list. The tooling lives in `scripts/` and never ships to the app bundle. It runs under plain `node` — Node's default TypeScript type-stripping lets these `.mjs` scripts import the authoritative `cardSchema` from `schema.ts`, so validity is defined in exactly one place.

- **`scripts/set-ingestion.mjs`** — pure, network-free core (unit-tested in `set-ingestion.test.mjs`):
  - `transformSourceCard(record, set, setSize)` maps one source record (the `sourceCardSchema` contract) into the canonical card-data object above, taking the set name from the registry and stamping `source` provenance. Game text is copied verbatim.
  - `validateCards(cards)` runs every card through `cardSchema` and returns each failure by card id and violation path — the trigger for extending an enum.
  - `serializeCards(cards)` emits the deterministic JSON: two-space indent, canonical key order, primitive arrays inline (`["Grass", "Colorless"]`) and object arrays expanded. It reproduces the checked-in A1 file byte-for-byte, so re-fetches diff cleanly.
- **`scripts/fetch-set-data.mjs`** (`npm run fetch:set -- <CODE> [--dry-run] [--no-flavor]`) — the network CLI: downloads the card database, filters to one set, enriches flavor per card, transforms → validates → writes `data/<set-name>-<code>.json`. Sequential requests, identifying user agent, spacing delay. `--dry-run` validates and reports the count without writing; `--no-flavor` skips the Limitless enrichment (faster iteration on the dotgg mapping). Fails with an explicit network-policy message (not a stack trace) when a source host is blocked, and aborts rather than writing a partial set if the count disagrees with the registry.
- **`scripts/validate-set-data.mjs`** (`npm run validate:set -- <file>`) — standalone validation over a card-data JSON array or JSONL, reusing `validateCards`. No network.

### Source provenance and endpoints

**`dotgg.gg`** card database is the primary source (`source.provider = "dotgg.gg"`, `source.slug` like `a1-1-bulbasaur`); **`pocket.limitlesstcg.com`** supplies flavor text; **`api.tcgdex.net`** is a rarity fallback for the newer sets dotgg has not backfilled rarity for (B1a on). All endpoints and the field mapping below were **confirmed against live responses (2026-07)**; the fetcher was re-derived from real records and reproduces the seeded A1 file byte-for-byte (flavor aside). A future wire-format change stays isolated to `normalizeDotggCard` / `parseLimitlessFlavor` / `mapTcgdexRarity` in `fetch-set-data.mjs`, since everything downstream is tested against the `sourceCardSchema` contract.

- **dotgg (cards):** `GET https://api.dotgg.gg/cgfw/getcards?game=pokepocket` — one bulk JSON array of **every** Pocket card across all sets (`setId` like `A1`, per-set `number`). The fetcher downloads it once and keeps the records whose `setId` matches and whose `number` ≤ the registry `cardCount`. dotgg also lists out-of-set promo/reprint rows numbered above the set (e.g. A1 `#328` Erika, `#334` Giovanni); the count bound excludes them. `GET .../cgfw/getsets?game=pokepocket` returns the set list (used only to cross-check counts).
- **Limitless (flavor):** `GET https://pocket.limitlesstcg.com/cards/<CODE>/<number>` — one HTML page per card; the flavor sentence is scraped from its `card-text-flavor` block. Only non-ex Pokémon carry flavor, so only those pages are requested. Enrichment is best-effort: a per-card miss leaves `flavorText` null, and a host block skips flavor entirely (with a warning) rather than aborting the fetch.
- **TCGdex (rarity fallback):** `GET https://api.tcgdex.net/v2/en/cards/<CODE>-<number>` (number zero-padded to three digits, matching TCGdex's `id`), returning one card as JSON with a `rarity` name. The fetcher requests it **only** for cards whose dotgg rarity is missing (`KNOWN_RARITY_CODES` gate in `fetch-set-data.mjs`), so a set dotgg fully describes never touches TCGdex. Unlike flavor, rarity is **required**: a host block aborts the fetch (never ships a card without a rarity), while a per-card miss is left unmapped so `cardSchema` names it. TCGdex names → app tuples via `mapTcgdexRarity`; the `☆☆` `Two Star` tier collapses to Super Rare (see the B1a/B2/B2a quirk above). Node's global `fetch` bypasses `HTTPS_PROXY`, so a proxied sandbox run needs `NODE_USE_ENV_PROXY=1` for TCGdex to be reachable. TCGdex has **not** ingested B2b–B3b yet (they 404), which is why those sets stay deferred.

**dotgg record → card-data field mapping** (`game=pokepocket`):

| dotgg field | card-data field | Notes |
| ----------- | --------------- | ----- |
| `slug` | `source.slug` | e.g. `a1-4-venusaur-ex` (raw, unpadded number). |
| `setId` + `number` | `id` | Zero-padded: `A1-004`. |
| `name` | `name.en` | English-only source; `name.ja` stays null. |
| `rarity` (label) | `rarity` | Label → `{ symbol, code, label }` lookup (see below). |
| `type` | `category` / `trainer.subtype` | `Pokemon` → Pokémon; otherwise Trainer. |
| `color` | `pokemon.type` | Energy type. |
| `hp`, `retreat` | `pokemon.hp`, `pokemon.retreatCost` | Numeric strings. |
| `stage` | `pokemon.stage` / `trainer.subtype` | `"Stage 1"`→`Stage1`; for Trainers it names the subtype (Supporter/Item/Tool/Stadium). |
| `prew_stage_name` | `pokemon.evolvesFrom` | |
| `rule` + name suffix | `pokemon.ruleBox` | Name `"… ex"` → `ex`, `"Mega …"`/Mega rule → `MegaEx`, else `None`. |
| `weakness` | `pokemon.weakness` | `"none"`/`"UNSPECIFIED"` (Dragon types) → `"none"` (schema reads as null). |
| `attack[].info` | `pokemon.attacks[]` | `"{GGCC} Giant Bloom 100"` → cost letters (G/R/W/L/P/F/D/M/C), name, damage; dotgg's `x` suffix → `×`. `effect` → attack `text` (`""`→null). |
| `ability[]` | `pokemon.abilities[]` | `{ info → name, effect → text }`. |
| `text` | `trainer.text` | |
| `props` "Pack Point"/"Dupe Reward" | `shop.packPoints`/`shop.dupeShinedust` | Values may carry a thousands separator (`"1,250"`). |
| `illustrator` | `illustrator` | |

Game text carries light HTML (`<br>` → newline; `<strong>` / `<span class="reminder-text">` stripped, inner text kept). `boosterPacks` is not exposed by dotgg (kept null). `pokemon.classification` is derived from dotgg's `flairs` (an `ultra-beast` flair slug → `UltraBeast`, from A3a; `Ancient`/`Future` have no signal yet). `pokemon.isBaby` is not sourced by anything and stays `false` — see the reserved-fields note.

**Rarity labels → codes.** `Common`→C, `Uncommon`→U, `Rare`→R, `Double Rare`→RR, `Art Rare`→AR, `Super Rare`→SR, `Special Art Rare`→SAR, `Immersive Rare`→IR, `Crown Rare`→CR (symbols/labels per the rarity table above). An unmapped label is passed through as its own `code`, so `cardSchema` rejects it and names the card — the trigger that first surfaced the Shiny tiers. dotgg exposes the A2b Shiny tiers as the labels **`"Shiny"`** (`✸`, code `S`) and **`"Shiny Super Rare"`** (`✸✸`, code `SSR`); both are now in `RARITY_BY_LABEL` (`fetch-set-data.mjs`) and the `code` enum (`schema.ts`). When rarity comes from **TCGdex** instead (B1a on), its differently-named tiers (`One Diamond`, `Two Star`, `One Shiny`, `Crown`, …) map onto the same tuples via `TCGDEX_RARITY_BY_NAME` / `mapTcgdexRarity`, with `Two Star` → Super Rare (the SR/SAR collapse noted above).
