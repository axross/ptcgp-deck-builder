# Abstraction Boundaries

Apply these rules to verify that new code respects the project's separation of concerns.

## Persistence / UI Split

This project's persistence boundary is browser storage (saved decks in `localStorage`) plus the static card catalog. When a component reads or writes storage directly, schema validation and key management scatter across every call site instead of living in one place.

**Guidelines:**

- MUST flag a component that calls `localStorage` / `sessionStorage` directly. Persistence MUST go through a dedicated store module (built on `src/lib/storage.ts`) so keys, Zod validation, and corrupt-data handling are centralized.
- MUST flag a store or catalog-access function that returns a raw unvalidated value instead of a Zod-parsed domain type. The store module owns the storage-to-domain transform.
- MUST flag a store or catalog-access function that imports UI modules (components, routing, view libraries) — persistence modules MUST be UI-free.

## Server / Client Boundary

Fetching from the client ships data-access code into the browser bundle and adds a network round-trip the server could have avoided.

**Guidelines:**

- MUST flag a client-side component that performs data fetching (network request, calling a catalog-access function) — see [Component Guidelines](../../component-guidelines/SKILL.md). Lift the fetch into the parent server-side component.
- MUST flag a client-side component that imports server-only modules. This will leak server code into the client bundle.
- MUST flag a server-side component that uses client-only state, lifecycle, event handlers, or browser APIs — it should be split into a server-side container and an interactive client child.
- MUST flag a server-only value type (e.g., an unresolved async/promise prop, where the framework allows it) being passed into a client component when the framework forbids it.

## Domain Pipeline Boundary

A shared pipeline copied into a second place drifts out of sync, so a fix applied to one copy silently skips the rest.

**Guidelines:**

- MUST flag any new component that re-creates a shared domain pipeline (e.g., assembling a content-transformation chain) outside its single owning module. The pipeline is a single chain, per the project's own domain skill, if defined.
- MUST flag domain processing attempted on the wrong side of the server/client boundary when the pipeline is server-side only.
- MUST flag a new node/element type added to a renderer's component-mapping table without a corresponding component import.

## Cross-Tier Imports

An import that runs against the tier hierarchy couples layers meant to stay independent, eroding the boundaries the tiers exist to enforce.

**Guidelines:**

- MUST flag any import path that crosses tiers in the wrong direction:
  - Group-shared / global modules MUST NOT import from a specific route's route-local code. Shared code should not depend on route-local code.
- SHOULD flag deep relative imports (`../../../`) that cross more than two directory levels — prefer the project's configured path aliases.
