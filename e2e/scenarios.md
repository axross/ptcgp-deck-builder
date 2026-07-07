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
| app.footer.disclaimer | Visitor sees the site-wide footer clarifying the app is unofficial and not affiliated with the Pokémon rights holders | home | should |
| cards.browse | Visitor browses the full multi-set card catalog as a grid | cards | must |
| cards.filter | Visitor filters the catalog and the filtered view is URL-shareable | cards | must |
| cards.filter.set | Visitor filters the catalog by expansion set and the selection is URL-shareable | cards | should |
| cards.search | Visitor searches the catalog by card name | cards | should |
| cards.empty-state | Visitor sees an empty state and clears filters when nothing matches | cards | should |
| cards.image-fallback | A card whose artwork fails to load shows the data-driven fallback frame | cards | should |
| deck.create.save | Visitor builds a legal 20-card deck, registers energy, names and saves it, and it survives reload | decks | must |
| deck.validation.live | Removing a card surfaces the deck-size violation live on the deck panel | decks | must |
| deck.energy.register | Visitor registers 1–3 Energy Zone types from the eight registrable ones | decks | should |
| deck.save.failure | A rejected storage write shows a visible error without crashing the editor | decks | may |
| deck.edit.existing | Visitor reopens a saved deck to edit, and an unknown deck id shows a not-found state | decks | must |
| decks.list.view | Visitor sees their saved decks listed with name, card count, energy, and legality after reload | decks | must |
| decks.open.edit | Visitor selects a saved deck from the list and lands in its editor with the deck loaded | decks | must |
| decks.delete | Visitor deletes a saved deck through a named confirmation and it stays gone after reload | decks | must |
| decks.empty-state | Visitor with no saved decks sees the empty state and a working New deck action | decks | should |
