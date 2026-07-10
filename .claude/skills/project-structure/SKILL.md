---
name: project-structure
description: Apply this skill when navigating the repository, deciding where a new module, route, component, hook, store, or test belongs, or checking stack, tooling, routing conventions, and directory layout in this project. Covers the Next.js App Router route-file conventions, the by-feature source layout under src/features, the shared tiers (src/components, src/lib), test colocation, and the e2e/scenario-catalog location. Use even when the user only mentions "where should this file go", a path, an import alias, or a config file.
---

# Project Structure

**ptcgp-deck-builder** is a web app for building Pokémon TCG Pocket (PTCGP) decks: browse the card catalog, assemble rule-valid decks, and save them in the visitor's own browser. This skill owns **placement** — where files live and the stack they sit on. How surfaces are *built* is owned by the project's component guidelines; how they *look* is owned by the project's UI design principles.

## Stack

- Runtime/framework: Next.js (App Router) with React; TypeScript in `strict` mode.
- Package manager: npm. Node version pinned in `.nvmrc`.
- Lint + format: Biome (`biome.json`); one tool for both.
- Unit tests: Vitest (`vitest.config.ts`), colocated `*.test.ts(x)` files under `src/`.
- E2E tests: Playwright (`playwright.config.ts`), specs under `e2e/` with the scenario catalog `e2e/scenarios.md`.
- Directory structure: **by feature** — domain code lives in `src/features/<feature>/`, not in layer-first buckets.
- Business logic: plain TypeScript modules plus React hooks; no framework-level pattern (no Bloc/Clean-Architecture layers).
- State management: Zustand for client state shared across components (e.g. the deck being edited); local `useState`/`useReducer` otherwise.
- Validation: Zod at every external boundary — browser-persisted decks, imported data, request inputs.
- Persistence: browser `localStorage` through `src/lib/storage.ts` (schema-validated reads/writes); no server-side database, no auth.
- Styling: CSS Modules plus CSS-variable design tokens in `src/app/globals.css`.
- Error reporting: Sentry via `instrumentation.ts` / `instrumentation-client.ts` and the `reportError` helper (`src/lib/report-error.ts`).
- Import alias: `@/*` → `src/*` (`tsconfig.json`).
- Hosting: Vercel.

## Top-Level Layout

| Path | Owns |
| ---- | ---- |
| `src/app/` | Next.js App Router routes: `page.tsx`, `layout.tsx`, `not-found.tsx`, error boundaries, route metadata, and each route's colocated `*.module.css` |
| `src/app/globals.css` | The design-token sheet (CSS variables) and base element styles |
| `src/features/<feature>/` | One product feature (e.g. `cards`, `decks`): its components, hooks, Zustand stores, schemas, and logic |
| `src/components/` | Shared, domain-free UI components used by ≥ 2 features (created when the first one is promoted) |
| `src/lib/` | Shared non-UI utilities (`storage.ts`, `report-error.ts`) |
| `e2e/` | Playwright specs and the scenario catalog (`scenarios.md`) |
| `scripts/` | Repository scripts (`check-scenario-coverage.mjs`) |
| `public/` | Static assets served verbatim |
| `.claude/` | Agent harness: skills, hooks, commands, settings |
| `.github/workflows/` | CI: `merge-checks.yaml` (lint, typecheck, docs links, unit tests), `claude-review.yaml` (independent review) |

## Routing Conventions

- Routes follow the App Router file conventions: `page.tsx` per route segment, shared chrome in `layout.tsx`, route-level errors in `error.tsx`, the app-wide last resort in `src/app/global-error.tsx`.
- Route segment directories are kebab-case and mirror the URL (e.g. `src/app/decks/[deckId]/`).
- Route metadata uses `export const metadata` (static) or `generateMetadata` (dynamic); consult current Next.js docs per the project's development guidelines (current-docs rules) before changing routing or metadata APIs.

## File Placement

- MUST put feature-specific code in `src/features/<feature>/` and keep route files under `src/app/` thin — a route composes feature modules, it does not implement them.
- MUST place shared UI in `src/components/` only when the tier rules in the project's component guidelines say it qualifies; the structure rule is only *where* each tier lives.
- MUST put shared non-UI utilities in `src/lib/`; a module there MUST NOT import UI code.
- MUST colocate unit tests as `*.test.ts(x)` next to the module under test, and styles as `<base-name>.module.css` next to the component that consumes them.
- MUST add e2e specs under `e2e/` as `<area>.spec.ts` and register new user journeys in `e2e/scenarios.md` per the project's end-to-end testing guidelines (scenario-coverage rules).
- MUST NOT place non-route files directly in a `src/app/` route segment unless they are Next.js route-file conventions or that route's colocated styles/components.

## Domain Data

The PTCGP card catalog and deck-construction rules live under `src/features/cards/` (Zod card schema, catalog access, the static per-set JSON datasets in `data/`) and `src/features/decks/` (deck schema, `deck-rules.ts` validation). What that data *means* — the card model, game rules, expansion inventory, dataset quirks, and how to add a new set — is owned by the project's PTCGP domain skill.
