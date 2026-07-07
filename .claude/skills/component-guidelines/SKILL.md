---
name: component-guidelines
description: Apply this skill when writing, placing, reviewing, or refactoring a React component or hook in this project — the shared-vs-feature tier boundary, promotion criteria for repeated UI, component anatomy (naming, props, server/client boundary, test-id hooks), CSS Modules styling composition, logic extraction into hooks or plain modules, Zustand store conventions, and accessibility basics. Use even when the user only mentions a component, hook, props, "use client", a store, or a test id.
---

# Component Guidelines

This skill owns **construction** — how components, hooks, and stores are built. *Where* the files live is owned by [Project Structure](../project-structure/SKILL.md); how surfaces *look* (tokens, controls, spacing, copy) is owned by [UI Design Principles](../ui-design-principles/SKILL.md).

## Component Catalog

Shared, domain-free components live in `src/components/`. Compose these instead of re-creating their look — re-implementing an existing control's appearance in a feature is a review finding.

| Component | Purpose |
| --------- | ------- |
| `VirtualizedGrid` (`virtualized-grid.tsx`) | Window-scrolled, row-virtualized grid: mounts only the rows near the viewport. The consumer's `rowClassName` owns the responsive column CSS; used by the `/cards` grid and the deck-picker grid |

**Guidelines:**

- MUST check this catalog before hand-rolling a control, and MUST add/remove rows in the same change that adds or removes a shared component.

## Tier Boundary

Two tiers: **shared** (`src/components/` — generic, domain-free) and **feature** (`src/features/<feature>/components/` — knows about cards, decks, and other domain concepts).

**Guidelines:**

- MUST keep `src/components/` free of domain imports: `grep -rn "features/" src/components/` is expected to return nothing.
- MUST keep shared components presentation-focused: no Zustand store access, no persistence; they receive data and callbacks via props.
- MAY let feature components import from `src/components/` and `src/lib/`; the reverse direction is forbidden.

## Promotion Criteria

- MUST NOT create a shared component for a single consumer; a one-off pattern stays in its feature.
- SHOULD promote a repeated pattern to `src/components/` once a **second feature** needs it and the shared shape is clear; extract the generic shell and leave domain wiring in each feature.
- SHOULD prefer a small amount of duplication over a shared component with a mode/variant prop for every consumer difference.

## Component Anatomy

- MUST name components in PascalCase and their files in kebab-case (`deck-list.tsx` exports `DeckList`); Next.js route files keep their framework names (`page.tsx`, `layout.tsx`).
- MUST use named exports for components; `export default` is reserved for Next.js route-file conventions.
- MUST type props with an explicit named type (e.g. `type DeckListProps = { … }`); avoid `React.FC`.
- MUST keep components server components by default; add `"use client"` only to the smallest subtree that needs state, effects, event handlers, or browser APIs (per [performance-and-reliability-requirements › server-client-boundary](../performance-and-reliability-requirements/references/server-client-boundary.md)).
- MUST give interactive or test-asserted elements a stable kebab-case `data-testid` (e.g. `data-testid="deck-card-count"`); e2e locators consume them per [e2e-testing-guidelines › conventions](../e2e-testing-guidelines/references/conventions.md).

## Styling Composition

- MUST style a component with its colocated `<base-name>.module.css`; class composition uses the module's classes plus an optional `className` prop appended last so consumers can extend spacing/layout.
- MUST NOT reach into another component's internals with descendant selectors or global CSS; extend via the component's own props.
- MUST use the design tokens (CSS variables) from `src/app/globals.css` for color, spacing, and radius values per [UI Design Principles](../ui-design-principles/SKILL.md).

## Logic Extraction

- MUST keep non-trivial pure logic (deck validation, filtering, sorting) in plain TypeScript modules within the feature, unit-tested with Vitest — not inline in components.
- SHOULD extract reusable stateful logic into a `use-*.ts` hook colocated in the feature's `hooks/` directory.
- MUST hold client state shared across components in a Zustand store (`src/features/<feature>/store.ts`), consumed through selector hooks; persistence from a store goes through `src/lib/storage.ts`, never raw `localStorage`.

## Accessibility

- MUST use semantic elements (`button`, `nav`, `ul`, headings in order) before reaching for ARIA attributes.
- MUST give every interactive control an accessible name (visible label, `aria-label`, or `aria-labelledby`) and keep it keyboard-operable with a visible focus state.
- MUST pair meaning-bearing color with a second channel per [UI Design Principles](../ui-design-principles/SKILL.md).
