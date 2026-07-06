# E2E Scenario Catalog

The human-authored journey catalog for scenario coverage (see
[e2e-testing-guidelines › scenario-coverage](../.claude/skills/e2e-testing-guidelines/references/scenario-coverage.md)).
One row per user journey the e2e suite is expected to assert. Ids are stable
dotted identifiers — renaming one requires updating every `@scenario:<id>` tag
in the same change. Priority is `must` | `should` | `may`; `must` rows are
hard-gated at 100% by `npm run test:e2e:coverage`. Titles must not contain a
`|` character — the coverage script parses this table by splitting on pipes.

| Id | Title | Area | Priority |
| -- | ----- | ---- | -------- |
| home.landing | Visitor opens the app and sees the deck builder landing page | home | must |
| cards.browse | Visitor browses the full Genetic Apex card catalog as a grid | cards | must |
| cards.filter | Visitor filters the catalog and the filtered view is URL-shareable | cards | must |
| cards.search | Visitor searches the catalog by card name | cards | should |
| cards.empty-state | Visitor sees an empty state and clears filters when nothing matches | cards | should |
