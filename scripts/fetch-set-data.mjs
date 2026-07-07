// One-shot-per-set developer tool: download an expansion's card data from the
// source, transform it into the repository's card-data shape, validate every
// card against `cardSchema`, and write the deterministic per-set JSON under
// src/features/cards/data/. Not part of the app bundle.
//
//   node scripts/fetch-set-data.mjs <SET_CODE> [--out <dir>] [--dry-run] [--no-flavor]
//   e.g. node scripts/fetch-set-data.mjs A2a --dry-run
//
// Provenance model (same as the seeded A1 data): the dotgg.gg card database is
// the primary source; pocket.limitlesstcg.com supplies flavor text where
// available. This is NOT runtime scraping — results are checked into the repo,
// so a set is fetched once (plus re-runs on corrections). It is a polite client:
// sequential requests, an identifying user agent, and a spacing delay.
//
// Network prerequisite: the source hosts must be reachable. Development
// sandboxes for this repo may block outbound fetches by network policy; running
// this requires an environment whose policy allowlists the source hosts. When a
// host is unreachable the tool exits with an explicit message (below), never a
// cryptic stack trace.
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { getSet, setCodes } from "../src/features/cards/set-registry.ts";
import {
  serializeCards,
  setDataFilename,
  transformSourceCard,
  validateCards,
} from "./set-ingestion.mjs";

const USER_AGENT =
  "ptcgp-deck-builder-set-fetcher/1.0 (+https://github.com/axross/ptcgp-deck-builder)";
const DEFAULT_OUT_DIR = "src/features/cards/data";
const REQUEST_SPACING_MS = 300;

// Confirmed source endpoints (probed 2026-07; recorded in the ptcgp-domain
// skill's card-data reference under "Source provenance and endpoints"):
//
// - dotgg.gg exposes its whole Pokémon TCG Pocket card database as one bulk
//   JSON array via the game-framework API (`game=pokepocket`). Cards carry a
//   `setId` (e.g. "A1") and a per-set `number`, so a single download is filtered
//   down to one set. `normalizeDotggCard` maps one raw record into the pipeline's
//   `sourceCardSchema` contract; it is the only place the upstream wire shape is
//   known.
// - Limitless serves one HTML page per card at /cards/<CODE>/<number>; the flavor
//   sentence (absent from dotgg) is scraped from it. `parseLimitlessFlavor`
//   extracts it. Flavor is optional, so this enrichment is best-effort.
const DOTGG_CARDS_URL = "https://api.dotgg.gg/cgfw/getcards?game=pokepocket";
const LIMITLESS_CARD_URL = (code, number) =>
  `https://pocket.limitlesstcg.com/cards/${code}/${number}`;

/** Raised when a request cannot reach the source host — a network-policy block. */
class NetworkBlockedError extends Error {
  constructor(url, cause) {
    super(
      `Network blocked: could not reach ${new URL(url).host}. ` +
        "The fetch pipeline needs outbound access to the source hosts " +
        "(api.dotgg.gg, pocket.limitlesstcg.com). This environment's network " +
        "policy must allowlist them (a repo-owner environment setting). " +
        `Underlying cause: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "NetworkBlockedError";
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a URL as text, translating unreachable-host errors and proxy/policy
 * rejections into a {@link NetworkBlockedError} so the failure is legible.
 */
async function fetchText(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json, text/html" },
    });
  } catch (cause) {
    throw new NetworkBlockedError(url, cause);
  }
  // The agent proxy fronting sandboxed environments answers a disallowed host
  // with 403/407; treat those as a policy block rather than a source error.
  if (response.status === 403 || response.status === 407) {
    throw new NetworkBlockedError(url, new Error(`HTTP ${response.status} from proxy`));
  }
  if (!response.ok) {
    throw new Error(`Request to ${url} failed: HTTP ${response.status} ${response.statusText}.`);
  }
  return response.text();
}

// The game's ten energy types, and the single-letter codes dotgg uses in an
// attack's `{...}` cost prefix (there is no Dragon energy symbol).
const ENERGY_TYPES = new Set([
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
]);
const ENERGY_BY_LETTER = {
  G: "Grass",
  R: "Fire",
  W: "Water",
  L: "Lightning",
  P: "Psychic",
  F: "Fighting",
  D: "Darkness",
  M: "Metal",
  C: "Colorless",
};

// dotgg names a rarity by a full label; the app models it as { symbol, code,
// label }. Codes/symbols mirror the seeded A1 data and the card-data reference.
const RARITY_BY_LABEL = new Map([
  ["Common", { symbol: "◇", code: "C", label: "Common" }],
  ["Uncommon", { symbol: "◇◇", code: "U", label: "Uncommon" }],
  ["Rare", { symbol: "◇◇◇", code: "R", label: "Rare" }],
  ["Double Rare", { symbol: "◇◇◇◇", code: "RR", label: "Double Rare" }],
  ["Art Rare", { symbol: "☆", code: "AR", label: "Art Rare" }],
  ["Super Rare", { symbol: "☆☆", code: "SR", label: "Super Rare" }],
  ["Special Art Rare", { symbol: "☆☆", code: "SAR", label: "Special Art Rare" }],
  ["Shiny", { symbol: "✸", code: "S", label: "Shiny" }],
  ["Shiny Super Rare", { symbol: "✸✸", code: "SSR", label: "Shiny Super Rare" }],
  ["Immersive Rare", { symbol: "☆☆☆", code: "IR", label: "Immersive Rare" }],
  ["Crown Rare", { symbol: "♛", code: "CR", label: "Crown Rare" }],
]);

/**
 * Maps a dotgg rarity label to the { symbol, code, label } tuple. An unknown
 * tier (e.g. A2b's "Shiny" / "Shiny Super Rare") is passed through with the raw
 * label as its `code`, so `cardSchema` rejects it and names the offending card —
 * the intended trigger to extend the rarity enum (see card-data.md's Step 4).
 */
function mapRarity(rawRarity) {
  const known = rawRarity == null ? undefined : RARITY_BY_LABEL.get(rawRarity);
  if (known !== undefined) {
    return known;
  }
  const label = rawRarity == null ? "Unknown" : String(rawRarity);
  return { symbol: label, code: label, label };
}

/**
 * Collapses dotgg's light HTML (game text carries `<br>`, `<strong>`, and
 * `<span class="reminder-text">`) into the plain text the card-data model
 * stores: `<br>` becomes a newline, every other tag is dropped, entities are
 * decoded, and the result is trimmed. Returns null for null input.
 */
function htmlToText(html) {
  if (html == null) {
    return null;
  }
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&rsquo;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function nonEmpty(text) {
  return text === "" ? null : text;
}

/**
 * Parses a dotgg attack `info` string — `"{GGCC} Giant Bloom 100"` or
 * `"{LL} Circle Circuit 30x"` — into cost (mapped energy types), name, damage,
 * and damage suffix (dotgg's lowercase `x` becomes the model's `×`).
 */
function parseAttackInfo(info) {
  const raw = String(info ?? "").trim();
  const costMatch = /^\{([A-Za-z]*)\}\s*/.exec(raw);
  const cost = costMatch
    ? [...costMatch[1]].map((letter) => ENERGY_BY_LETTER[letter] ?? letter)
    : [];
  let rest = costMatch ? raw.slice(costMatch[0].length) : raw;

  let damage = null;
  let damageSuffix = null;
  const damageMatch = /\s+(\d+)\s*([+x×])?$/.exec(rest);
  if (damageMatch !== null) {
    damage = Number(damageMatch[1]);
    damageSuffix = damageMatch[2] === "+" ? "+" : damageMatch[2] ? "×" : null;
    rest = rest.slice(0, damageMatch.index);
  }
  return { name: rest.trim(), cost, damage, damageSuffix };
}

function normalizeAttacks(attack) {
  if (!Array.isArray(attack)) {
    return [];
  }
  return attack.map((entry) => {
    const { name, cost, damage, damageSuffix } = parseAttackInfo(entry.info);
    return { name, cost, damage, damageSuffix, text: nonEmpty(htmlToText(entry.effect)) };
  });
}

function normalizeAbilities(ability) {
  if (!Array.isArray(ability)) {
    return [];
  }
  return ability.map((entry) => ({
    name: htmlToText(entry.info) ?? "",
    text: htmlToText(entry.effect) ?? "",
  }));
}

function normalizeStage(stage) {
  switch (stage) {
    case "Basic":
      return "Basic";
    case "Stage 1":
      return "Stage1";
    case "Stage 2":
      return "Stage2";
    default:
      return stage; // an unmapped stage fails cardSchema, naming the card
  }
}

/**
 * Derives the rule-box tier. Every ex card is named "… ex" (and Mega ex "Mega …
 * ex"); dotgg's `rule` text confirms it. Non-ex Pokémon carry no rule text.
 */
function deriveRuleBox(raw) {
  const rule = String(raw.rule ?? "");
  const name = String(raw.name ?? "");
  if (/mega/i.test(rule) || /^mega /i.test(name)) {
    return "MegaEx";
  }
  if (/ ex is knocked out/i.test(rule) || / ex$/i.test(name)) {
    return "ex";
  }
  return "None";
}

/**
 * Normalizes a Pokémon's weakness. dotgg encodes "no weakness" (Dragon types)
 * as "none" or "UNSPECIFIED"; both become "none", which `cardSchema` reads as
 * null. A real energy type passes through verbatim.
 */
function normalizeWeakness(weakness) {
  return typeof weakness === "string" && ENERGY_TYPES.has(weakness) ? weakness : "none";
}

/**
 * Resolves a Trainer's subtype. dotgg puts the specific kind in `stage` for most
 * Trainers (a generic `type: "Trainer"`) but in `type` for Pokémon Tools (whose
 * `stage` is null). Fossils are modeled as Items, matching the seeded A1 data.
 */
function mapTrainerSubtype(raw) {
  const stage = raw.stage && raw.stage !== "null" ? raw.stage : null;
  const kind = stage ?? raw.type;
  switch (kind) {
    case "Supporter":
      return "Supporter";
    case "Item":
    case "Fossil":
      return "Item";
    case "Tool":
    case "Pokémon Tool":
      return "PokemonTool";
    case "Stadium":
      return "Stadium";
    default:
      return kind; // an unmapped subtype fails cardSchema, naming the card
  }
}

function findProp(props, name) {
  if (!Array.isArray(props)) {
    return null;
  }
  const prop = props.find((entry) => entry && entry.name === name);
  return prop ? prop.value : null;
}

function toIntOrNull(value) {
  if (value == null || value === "") {
    return null;
  }
  // dotgg formats large shop numbers with a thousands separator ("1,250").
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

/**
 * Maps one raw dotgg.gg (`game=pokepocket`) card record into this pipeline's
 * source-record contract ({@link sourceCardSchema}). This is the single adapter
 * between the upstream wire format and everything downstream; if dotgg's fields
 * change, only this function (and its helpers above) change. `flavorText` is
 * left null here and enriched from Limitless afterwards.
 */
export function normalizeDotggCard(raw, code) {
  const isPokemon = raw.type === "Pokemon";
  return {
    slug: raw.slug,
    setCode: code,
    number: Number(raw.number),
    name: raw.name,
    rarity: mapRarity(raw.rarity),
    category: isPokemon ? "Pokemon" : "Trainer",
    illustrator: raw.illustrator ?? null,
    // dotgg does not expose pack-exclusivity; the model reserves the field.
    boosterPacks: null,
    flavorText: null,
    shop: {
      packPoints: toIntOrNull(findProp(raw.props, "Pack Point")),
      dupeShinedust: toIntOrNull(findProp(raw.props, "Dupe Reward")),
    },
    pokemon: isPokemon
      ? {
          type: raw.color,
          hp: Number(raw.hp),
          stage: normalizeStage(raw.stage),
          evolvesFrom: raw.prew_stage_name ?? null,
          ruleBox: deriveRuleBox(raw),
          // Not exposed by dotgg for the currently-seedable sets; revisit when
          // seeding A4+ (Baby Pokémon) and A3a+ (UltraBeast/Ancient/Future).
          isBaby: false,
          classification: null,
          weakness: normalizeWeakness(raw.weakness),
          retreatCost: Number(raw.retreat ?? 0),
          abilities: normalizeAbilities(raw.ability),
          attacks: normalizeAttacks(raw.attack),
        }
      : null,
    trainer: isPokemon
      ? null
      : { subtype: mapTrainerSubtype(raw), text: htmlToText(raw.text) ?? "" },
  };
}

/** Extracts the flavor sentence from one Limitless card page, or null. */
const LIMITLESS_FLAVOR_RE = /<div class="card-text-section card-text-flavor">([\s\S]*?)<\/div>/;
export function parseLimitlessFlavor(html) {
  const match = LIMITLESS_FLAVOR_RE.exec(html);
  return match === null ? null : nonEmpty(htmlToText(match[1]));
}

/**
 * Downloads dotgg's whole Pocket card database once and returns the normalized
 * source records for one set: those whose `setId` matches and whose `number` is
 * within the set's registry count (dotgg also lists a handful of out-of-set
 * promo/reprint rows numbered above the set — e.g. A1 #328/#334 — which the
 * count bound excludes).
 */
async function fetchSourceCards(set) {
  const all = JSON.parse(await fetchText(DOTGG_CARDS_URL));
  if (!Array.isArray(all)) {
    throw new Error("Unexpected dotgg response: expected a JSON array of cards.");
  }
  return all
    .filter((raw) => raw.setId === set.code && Number(raw.number) <= set.cardCount)
    .map((raw) => normalizeDotggCard(raw, set.code));
}

/**
 * Best-effort flavor enrichment from Limitless, one card page per request. Only
 * non-ex Pokémon carry flavor, so only those are fetched. A per-card failure
 * leaves that card's flavor null; a host-level block skips enrichment entirely
 * (flavor is optional) with a warning rather than aborting the fetch.
 */
async function fetchFlavorMap(set, sources) {
  const map = new Map();
  const targets = sources.filter(
    (source) =>
      source.category === "Pokemon" && source.pokemon && source.pokemon.ruleBox === "None",
  );
  for (const [index, source] of targets.entries()) {
    if (index > 0) {
      await delay(REQUEST_SPACING_MS); // polite: space out per-card requests
    }
    let html;
    try {
      html = await fetchText(LIMITLESS_CARD_URL(set.code, source.number));
    } catch (error) {
      if (error instanceof NetworkBlockedError) {
        console.error(`Flavor enrichment skipped — ${error.message}`);
        return map;
      }
      continue; // a single card page failing is fine — flavor is optional
    }
    const flavor = parseLimitlessFlavor(html);
    if (flavor !== null) {
      map.set(source.number, flavor);
    }
  }
  return map;
}

function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      "no-flavor": { type: "boolean", default: false },
    },
  });
  return {
    code: positionals[0],
    outDir: values.out ?? DEFAULT_OUT_DIR,
    dryRun: values["dry-run"],
    noFlavor: values["no-flavor"],
  };
}

async function main() {
  const { code, outDir, dryRun, noFlavor } = parseCliArgs(process.argv.slice(2));

  if (code === undefined) {
    console.error(
      "Usage: node scripts/fetch-set-data.mjs <SET_CODE> [--out <dir>] [--dry-run] [--no-flavor]",
    );
    process.exit(2);
  }
  const set = getSet(code);
  if (set === null) {
    console.error(`Unknown set code "${code}". Known sets: ${setCodes.join(", ")}.`);
    process.exit(2);
  }

  console.error(`Fetching ${set.name} (${set.code}) — expecting ${set.cardCount} cards…`);

  const sources = await fetchSourceCards(set);
  const flavor = noFlavor ? new Map() : await fetchFlavorMap(set, sources);
  if (!noFlavor) {
    console.error(`Enriched ${flavor.size} card(s) with flavor text from Limitless.`);
  }
  const cards = sources.map((source) => {
    const withFlavor = flavor.has(source.number)
      ? { ...source, flavorText: flavor.get(source.number) }
      : source;
    return transformSourceCard(withFlavor, set, set.cardCount);
  });

  const { ok, errors } = validateCards(cards);
  if (!ok) {
    console.error(`Validation failed for ${errors.length} card(s):`);
    for (const error of errors) {
      console.error(`  ${error.id}: ${error.violations.join("; ")}`);
    }
    process.exit(1);
  }

  if (cards.length !== set.cardCount) {
    console.error(
      `Expected ${set.cardCount} cards for ${set.code} (per the registry) but fetched ${cards.length}. ` +
        "Aborting so a partial set is never written.",
    );
    process.exit(1);
  }

  const filename = setDataFilename(set.name, set.code);
  const outPath = path.join(outDir, filename);
  const json = serializeCards(cards);

  if (dryRun) {
    console.error(`Dry run: ${cards.length} cards validated; would write ${outPath}.`);
    return;
  }

  if (existsSync(outPath)) {
    console.error(`Note: overwriting existing ${outPath} (re-fetch/correction).`);
  }
  writeFileSync(outPath, json);
  console.error(`Wrote ${cards.length} cards to ${outPath}.`);
  console.error(
    "Next: register the file in src/features/cards/catalog.ts and confirm the registry row.",
  );
}

// Only fetch when run as the CLI; importing the module (e.g. from the unit
// tests that exercise the pure adapters) must not touch the network.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    if (error instanceof NetworkBlockedError) {
      console.error(error.message);
      process.exit(3);
    }
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
