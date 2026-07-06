// Scenario-coverage reporter and gate over the e2e journey catalog
// (e2e/scenarios.md) and the Playwright JSON report (test-results/results.json).
//
// Default: prints covered/total overall and per priority, lists uncovered
// scenarios, and fails ONLY on structural tag errors (an unknown scenario id,
// or a facet tag that disagrees with the catalog row).
// With --gate-must: additionally fails when any `must`-priority scenario has
// no passing test carrying its tag.
//
// Run after `playwright test` — a scenario counts as covered only when a
// passing test carries its `@scenario:<id>` tag.
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.dirname(new URL(import.meta.url).pathname);
const catalogPath = path.join(root, "..", "e2e", "scenarios.md");
const resultsPath = path.join(root, "..", "test-results", "results.json");
const gateMust = process.argv.includes("--gate-must");

const PRIORITIES = ["must", "should", "may"];

function readCatalog() {
  const lines = readFileSync(catalogPath, "utf8").split("\n");
  const scenarios = new Map();
  for (const line of lines) {
    const cells = line.split("|").map((cell) => cell.trim());
    // A catalog row: | id | title | area | priority |
    if (cells.length < 6 || cells[1] === "Id" || /^-+$/.test(cells[1])) {
      continue;
    }
    const [, id, title, area, priority] = cells;
    if (!PRIORITIES.includes(priority)) {
      fail(`catalog row "${id}" has invalid priority "${priority}" (want must|should|may)`);
    }
    scenarios.set(id, { id, title, area, priority });
  }
  if (scenarios.size === 0) {
    fail(`no scenario rows found in ${catalogPath}`);
  }
  return scenarios;
}

function readResults() {
  let raw;
  try {
    raw = readFileSync(resultsPath, "utf8");
  } catch {
    fail(`Playwright JSON report not found at ${resultsPath} — run \`npx playwright test\` first.`);
  }
  const specs = [];
  const walk = (suite) => {
    for (const child of suite.suites ?? []) {
      walk(child);
    }
    for (const spec of suite.specs ?? []) {
      specs.push(spec);
    }
  };
  for (const suite of JSON.parse(raw).suites ?? []) {
    walk(suite);
  }
  return specs;
}

function fail(message) {
  console.error(`scenario-coverage: ${message}`);
  process.exit(1);
}

const scenarios = readCatalog();
const specs = readResults();

const structuralErrors = [];
const coveredIds = new Set();

for (const spec of specs) {
  const tags = (spec.tags ?? []).map((tag) => tag.replace(/^@/, ""));
  const scenarioIds = tags.filter((t) => t.startsWith("scenario:")).map((t) => t.slice(9));
  const areas = tags.filter((t) => t.startsWith("area:")).map((t) => t.slice(5));
  const priorities = tags.filter((t) => t.startsWith("priority:")).map((t) => t.slice(9));

  for (const id of scenarioIds) {
    const scenario = scenarios.get(id);
    if (!scenario) {
      structuralErrors.push(`test "${spec.title}" tags unknown scenario id "${id}"`);
      continue;
    }
    for (const area of areas) {
      if (area !== scenario.area) {
        structuralErrors.push(
          `test "${spec.title}" tags @area:${area} but scenario "${id}" has area "${scenario.area}"`,
        );
      }
    }
    for (const priority of priorities) {
      if (priority !== scenario.priority) {
        structuralErrors.push(
          `test "${spec.title}" tags @priority:${priority} but scenario "${id}" has priority "${scenario.priority}"`,
        );
      }
    }
    if (spec.ok) {
      coveredIds.add(id);
    }
  }
}

const all = [...scenarios.values()];
const uncovered = all.filter((s) => !coveredIds.has(s.id));

console.log(`scenario coverage: ${coveredIds.size}/${all.length} scenarios asserted`);
for (const priority of PRIORITIES) {
  const rows = all.filter((s) => s.priority === priority);
  if (rows.length === 0) {
    continue;
  }
  const covered = rows.filter((s) => coveredIds.has(s.id)).length;
  console.log(`  ${priority}: ${covered}/${rows.length}`);
}
for (const scenario of uncovered) {
  console.log(`  uncovered: ${scenario.id} (${scenario.priority}) — ${scenario.title}`);
}

if (structuralErrors.length > 0) {
  for (const error of structuralErrors) {
    console.error(`structural error: ${error}`);
  }
  process.exit(1);
}

if (gateMust) {
  const uncoveredMust = uncovered.filter((s) => s.priority === "must");
  if (uncoveredMust.length > 0) {
    fail(`must-priority scenarios uncovered: ${uncoveredMust.map((s) => s.id).join(", ")}`);
  }
}
