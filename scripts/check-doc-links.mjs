// Relative-link integrity across the repository's Markdown files, including
// the .claude/ dot-directory tree. Successor to the adapted-away template
// tooling; run via `npm run check:links` (also part of the merge-checks CI).
//
// Fenced code blocks and inline code spans are stripped first so illustrative
// example paths are not treated as links.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  "out",
  "coverage",
]);

function markdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        files.push(...markdownFiles(path.join(dir, entry.name)));
      }
    } else if (entry.name.endsWith(".md")) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const broken = [];
for (const file of markdownFiles(root)) {
  const text = readFileSync(file, "utf8")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
  for (const match of text.matchAll(/\]\(([^)\s]+)(?:\s[^)]*)?\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#|<)/.test(target)) {
      continue;
    }
    const relative = decodeURIComponent(target.split("#")[0]);
    if (relative === "") {
      continue;
    }
    const resolved = path.resolve(path.dirname(file), relative);
    if (!existsSync(resolved)) {
      broken.push(`${path.relative(root, file)}: ${target}`);
    }
  }
}

if (broken.length > 0) {
  console.error("Broken relative Markdown links:");
  for (const entry of broken) {
    console.error(`  ${entry}`);
  }
  process.exit(1);
}
console.log("doc links OK");
