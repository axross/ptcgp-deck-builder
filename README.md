# ptcgp-deck-builder

A web app for building **Pokémon TCG Pocket (PTCGP)** decks: browse the card
catalog, assemble rule-valid decks, and save them in your own browser
(`localStorage`) — no backend database, no accounts. It runs entirely in the
visitor's browser, so decks stay private to the device that built them.

> **Status:** early scaffold. The Genetic Apex (A1) card catalog (286 cards)
> and the deck-construction rules are implemented under `src/features/`; the
> deck-builder UI is next. Game knowledge is documented in the
> [PTCGP Domain](.claude/skills/ptcgp-domain/SKILL.md) skill.

## Tech stack

| Area | Tool |
| ---- | ---- |
| Language | TypeScript (strict) |
| App framework / runtime | [Next.js](https://nextjs.org/) (App Router) + React |
| Package manager | npm |
| Linting & formatting | [Biome](https://biomejs.dev/) (lint + format) |
| Unit tests | [Vitest](https://vitest.dev/) |
| E2E tests | [Playwright](https://playwright.dev/) with a [scenario-coverage catalog](e2e/scenarios.md) |
| Client state | [Zustand](https://zustand.docs.pmnd.rs/) |
| Validation | [Zod](https://zod.dev/) |
| Styling | CSS Modules with CSS-variable design tokens |
| Data / content layer | Browser `localStorage`; the card dataset is seeded under `src/features/cards/data/` |
| Error reporting | [Sentry](https://sentry.io/) (enabled when `NEXT_PUBLIC_SENTRY_DSN` is set) |
| Hosting | [Vercel](https://vercel.com/) |

## Getting started

1. Install dependencies: `npm install`
2. Start developing: `npm run dev`, then open <http://localhost:3000>
3. Production build and start: `npm run build`, then `npm run start`

Error reporting is optional: set `NEXT_PUBLIC_SENTRY_DSN` in `.env.local` to
enable Sentry; without it the app runs the same, just without error capture.

## Development workflow

Development in this repository is agent-assisted via
[Claude Code](https://claude.com/claude-code). The working agreement lives in
[`AGENTS.md`](./AGENTS.md) (loaded through `CLAUDE.md`) and routes to the
detailed skills under [`.claude/skills/`](./.claude/skills). Human and agent
contributors follow the same loop: plan → implement → self-review → verify →
report.

### `/address` — deliver a unit of work end-to-end

[`/address`](./.claude/skills/address/SKILL.md) is the main delivery entry point.
It takes one unit of work — a GitHub issue, a pull request, or a free-form
prompt — from intake to a merge-ready pull request in a single continuing
session:

1. **Plan** — reads the issue and its thread, asks you the product and scope
   questions the spec leaves open, and rewrites the issue body into a
   reviewable plan with acceptance criteria. It then **always pauses for your
   approval**: it verifies nothing gets built until you review the plan and
   send `/address continue`.
2. **Code + verify** — implements the approved plan (on a separate worktree
   unless it is running in a Claude Code cloud environment, so it never blocks
   your working copy) on an agent-namespaced branch, runs the checks the
   changed surface requires, and self-reviews the diff.
3. **Independent review** — opens a draft pull request and requests the CI
   reviewer, a separate bot session, so the code's author never certifies its
   own work.
4. **Address** — fixes review findings and CI failures, tying each resolved
   thread to the resolving commit, for up to eight rounds.
5. **Ready** — flips the pull request to ready once CI is green and the review
   is clean. Merging always stays a human decision.

Practical examples:

```text
/address https://github.com/OWNER/REPO/issues/42   # deliver issue #42 end-to-end
/address 57                                        # resume delivery of open PR #57
/address The 404 page should link back home        # no issue yet: files a tracking
                                                   #   issue, then delivers it
/address continue                                  # approve a paused plan, or resume
                                                   #   after you answer a question,
                                                   #   leave PR comments, or start a
                                                   #   fresh session from a /handoff
                                                   #   package
```

Every run pauses after the plan for your approval, and pauses again whenever it
genuinely needs a human — an ambiguous requirement, a judgment call on
conflicting changes — and `/address continue` picks it back up where it
stopped.

### `/handoff` — suspend work for another session

[`/handoff`](./.claude/skills/handoff/SKILL.md) packages in-progress work — goal,
current state, remaining to-dos, uncommitted changes — into a downloadable
`handoff-<epoch>.md` (plus an optional zip of supporting files). Use it when a
session is running low on context, or to park work for later; a fresh session
(yours or a teammate's) takes the package over with `/address continue`.

Changes made without an agent follow the same bar: branch, implement, run the
checks below, open a pull request, and get it reviewed before merge.

## Testing

Unit tests (Vitest) cover the card model, deck-construction rules, and other
logic in isolation; the Playwright e2e suite drives user-facing flows against a
[scenario-coverage catalog](e2e/scenarios.md). CI merge gates (Biome lint, type
check, docs links, Vitest) run in
[`merge-checks.yaml`](.github/workflows/merge-checks.yaml).

| Check | Command |
| ----- | ------- |
| Format | `npm run format` |
| Lint | `npm run lint` |
| Type-check | `npm run typecheck` |
| Unit tests | `npm run test:unit` |
| E2E tests | `npm run test:e2e` |

Run format + lint after every change, and the suites relevant to the changed
surface before opening a pull request — see the Verification section of
[`AGENTS.md`](./AGENTS.md). `npm run test:e2e:coverage` runs the same e2e suite
while gating `must`-priority scenarios at 100%.
