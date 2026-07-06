# ptcgp-deck-builder

A web app for building **Pokémon TCG Pocket (PTCGP)** decks: browse the card
catalog, assemble rule-valid decks, and save them in your own browser
(`localStorage`) — no backend database, no accounts.

> **Status:** freshly initialized. The card catalog and deck-construction
> rules are pending the authoritative game documents; see
> [Project Structure › Domain Data](.claude/skills/project-structure/SKILL.md#domain-data-pending).

## Stack

- [Next.js](https://nextjs.org/) (App Router) + React, TypeScript (strict)
- [Zustand](https://zustand.docs.pmnd.rs/) for client state, [Zod](https://zod.dev/) for validation
- CSS Modules with CSS-variable design tokens
- [Biome](https://biomejs.dev/) for linting and formatting
- [Vitest](https://vitest.dev/) unit tests, [Playwright](https://playwright.dev/) e2e tests with a
  [scenario-coverage catalog](e2e/scenarios.md)
- [Sentry](https://sentry.io/) error reporting (enabled when `NEXT_PUBLIC_SENTRY_DSN` is set)
- Hosted on [Vercel](https://vercel.com/)

## Getting Started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Commands

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm run start` | Production build / serve it |
| `npm run format` | Format with Biome |
| `npm run lint` | Lint (and format-check) with Biome |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run test:unit` | Run the Vitest unit suite |
| `npm run test:e2e` | Run Playwright e2e tests + the scenario-coverage report |
| `npm run test:e2e:coverage` | Same, gating `must`-priority scenarios at 100% |

## Contributing / Agents

This repository is agent-ready: [`AGENTS.md`](AGENTS.md) is the master routing
index for the project skills under [`.claude/skills/`](.claude/skills/), and
[`REVIEW.md`](REVIEW.md) is the posted-review policy applied by the CI reviewer
([`claude-review.yaml`](.github/workflows/claude-review.yaml)). CI merge gates
(Biome lint + Vitest) run in
[`merge-checks.yaml`](.github/workflows/merge-checks.yaml).
