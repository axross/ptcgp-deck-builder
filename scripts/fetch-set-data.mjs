// One-shot-per-set developer tool: download an expansion's card data from the
// source, transform it into the repository's card-data shape, validate every
// card against `cardSchema`, and write the deterministic per-set JSON under
// src/features/cards/data/. Not part of the app bundle.
//
//   node scripts/fetch-set-data.mjs <SET_CODE> [--out <dir>] [--dry-run]
//   e.g. node scripts/fetch-set-data.mjs A2
//
// Provenance model (same as the seeded A1 data): the dotgg.gg card database is
// the primary source; pocket.limitlesstcg.com supplies flavor text where
// available. This is NOT runtime scraping — results are checked into the repo,
// so a set is fetched once (plus re-runs on corrections). It is a polite client:
// sequential requests and an identifying user agent.
//
// Network prerequisite: the source hosts must be reachable. Development
// sandboxes for this repo block outbound fetches by network policy; running this
// requires an environment whose policy allowlists the source hosts. When the
// network is blocked the tool exits with an explicit message (below), never a
// cryptic stack trace.
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
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

// Source endpoints. The exact paths/response formats are confirmed on the first
// run in a network-enabled environment and recorded in the ptcgp-domain skill's
// card-data reference; only the two adapter functions below (normalizeDotggCard,
// parseLimitlessFlavor) and these URLs change if the upstream shape differs.
const DOTGG_SET_URL = (code) => `https://pocket.dotgg.gg/api/sets/${code.toLowerCase()}/cards`;
const LIMITLESS_SET_URL = (code) => `https://pocket.limitlesstcg.com/cards/${code}?display=text`;

/** Raised when a request cannot reach the source host — a network-policy block. */
class NetworkBlockedError extends Error {
  constructor(url, cause) {
    super(
      `Network blocked: could not reach ${new URL(url).host}. ` +
        "The fetch pipeline needs outbound access to the source hosts " +
        "(dotgg.gg, pocket.limitlesstcg.com). This environment's network policy " +
        "must allowlist them (a repo-owner environment setting). " +
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

/**
 * Maps one raw dotgg.gg card record into this pipeline's source-record contract
 * ({@link sourceCardSchema}). This is the single adapter between the upstream
 * wire format and everything downstream; if dotgg's field names differ from the
 * assumption below, only this function changes. Confirm the raw shape on the
 * first networked run and record it in the card-data reference.
 */
function normalizeDotggCard(raw, code) {
  const isPokemon = String(raw.cardType ?? raw.category ?? "Pokemon") === "Pokemon";
  return {
    slug: raw.id ?? raw.slug,
    setCode: code,
    number: Number(raw.number),
    name: raw.name,
    rarity: raw.rarity,
    category: isPokemon ? "Pokemon" : "Trainer",
    illustrator: raw.illustrator ?? null,
    boosterPacks: raw.boosterPacks ?? null,
    flavorText: raw.flavorText ?? null,
    shop: {
      packPoints: raw.packPoints ?? null,
      dupeShinedust: raw.dupeShinedust ?? null,
    },
    pokemon: isPokemon ? raw.pokemon : null,
    trainer: isPokemon ? null : raw.trainer,
  };
}

/** Extracts a number→flavor-text map from a Limitless set page. */
function parseLimitlessFlavor(payload) {
  const map = new Map();
  // Limitless serves the set as JSON when possible; fall back to an empty map
  // (flavor is optional per the card-data reference). Confirm the real response
  // shape on the first networked run.
  let records;
  try {
    records = JSON.parse(payload);
  } catch {
    return map;
  }
  for (const record of Array.isArray(records) ? records : []) {
    if (record?.number != null && typeof record.flavorText === "string") {
      map.set(Number(record.number), record.flavorText);
    }
  }
  return map;
}

async function fetchSourceCards(code) {
  const dotgg = JSON.parse(await fetchText(DOTGG_SET_URL(code)));
  const raw = Array.isArray(dotgg) ? dotgg : (dotgg.cards ?? []);
  return raw.map((record) => normalizeDotggCard(record, code));
}

async function fetchFlavorMap(code) {
  await delay(REQUEST_SPACING_MS); // polite: space the second host's request out
  return parseLimitlessFlavor(await fetchText(LIMITLESS_SET_URL(code)));
}

function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      out: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  return { code: positionals[0], outDir: values.out ?? DEFAULT_OUT_DIR, dryRun: values["dry-run"] };
}

async function main() {
  const { code, outDir, dryRun } = parseCliArgs(process.argv.slice(2));

  if (code === undefined) {
    console.error("Usage: node scripts/fetch-set-data.mjs <SET_CODE> [--out <dir>] [--dry-run]");
    process.exit(2);
  }
  const set = getSet(code);
  if (set === null) {
    console.error(`Unknown set code "${code}". Known sets: ${setCodes.join(", ")}.`);
    process.exit(2);
  }

  console.error(`Fetching ${set.name} (${set.code}) — expecting ${set.cardCount} cards…`);

  const sources = await fetchSourceCards(set.code);
  const flavor = await fetchFlavorMap(set.code);
  const cards = sources.map((source) => {
    const withFlavor =
      source.flavorText == null && flavor.has(source.number)
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

main().catch((error) => {
  if (error instanceof NetworkBlockedError) {
    console.error(error.message);
    process.exit(3);
  }
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
