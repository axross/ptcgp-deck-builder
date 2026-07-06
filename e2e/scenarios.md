# E2E Scenario Catalog

The human-authored journey catalog for scenario coverage (see
[e2e-testing-guidelines › scenario-coverage](../.claude/skills/e2e-testing-guidelines/references/scenario-coverage.md)).
One row per user journey the e2e suite is expected to assert. Ids are stable
dotted identifiers — renaming one requires updating every `@scenario:<id>` tag
in the same change. Priority is `must` | `should` | `may`; `must` rows are
hard-gated at 100% by `npm run test:e2e:coverage`.

| Id | Title | Area | Priority |
| -- | ----- | ---- | -------- |
| home.landing | Visitor opens the app and sees the deck builder landing page | home | must |
