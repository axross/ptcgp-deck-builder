// Standalone card-data validator: run every card in a file through the
// authoritative `cardSchema` and report each failure by card id and violation.
// Shares its validation with the fetch pipeline (set-ingestion.mjs) so a card
// that passes here is exactly a card the app will accept. No network needed.
//
//   node scripts/validate-set-data.mjs <file>
//
// The file may be a JSON array of cards (the emitted per-set format) or JSONL
// (one card object per line). Exits 0 when every card is valid, 1 otherwise.
import { readFileSync } from "node:fs";
import process from "node:process";
import { validateCards } from "./set-ingestion.mjs";

/** Parses the input as a JSON array of cards, or as JSONL (one card per line). */
function parseCards(text, file) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }
  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (cause) {
        throw new Error(
          `${file}: line ${index + 1} is not valid JSON: ${cause instanceof Error ? cause.message : cause}`,
        );
      }
    });
}

function main() {
  const file = process.argv[2];
  if (file === undefined) {
    console.error("Usage: node scripts/validate-set-data.mjs <file.json|file.jsonl>");
    process.exit(2);
  }

  const cards = parseCards(readFileSync(file, "utf8"), file);
  const { ok, errors } = validateCards(cards);

  if (ok) {
    console.error(`OK: ${cards.length} card(s) valid in ${file}.`);
    return;
  }

  console.error(`Invalid: ${errors.length} of ${cards.length} card(s) in ${file} failed:`);
  for (const error of errors) {
    console.error(`  ${error.id}: ${error.violations.join("; ")}`);
  }
  process.exit(1);
}

main();
