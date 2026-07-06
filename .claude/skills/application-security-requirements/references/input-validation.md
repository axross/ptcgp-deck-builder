# Input Validation

Apply these rules to verify every untrusted input is validated and coerced before reaching persistence, an outbound `fetch`, or any rendering pipeline. Treat the static types at a request boundary as unverified: the runtime value may not match its declared type (e.g., a single query param may arrive as a string, an array, or `undefined`).

## Route Inputs (params, query params)

Route and query params are the cheapest input an attacker controls — anyone crafts them in a URL — and the declared types at the boundary promise shapes the runtime never enforces.

**Guidelines:**

- MUST flag a Critical when a route param or query param value reaches a catalog/storage lookup, a `fetch` URL, or a redirect target without an explicit type assertion or validation-library parse. The static type at the boundary lies — at runtime a query value can be `string | string[] | undefined`.
- MUST flag a Major when a boolean query param is coerced via a truthy check (`if (query.flag)`) instead of value comparison (`query.flag === "true"`). Diverging risks treating a `?flag=false` value as truthy.
- MUST flag a Critical when a dynamic segment (e.g., a card or deck identifier path param) is passed into a lookup without ensuring it is a string. An array value can bypass an equals comparison.

## Server Actions and Request Handlers

Request bodies and form data arrive from arbitrary clients, so the handler's parameter types describe intent, not what actually shows up at runtime.

**Guidelines:**

- MUST flag a Critical when a new request handler reads a JSON body, form data, or the request URL without a schema (or equivalent runtime check) validating the parsed shape before use.
- MUST flag a Critical when a new server-side callable invoked from the client accepts arguments without runtime validation, regardless of static types.

## Browser-Persisted Data

localStorage is writable by any code running on the origin and survives app versions, so stored decks drift from the code's expectations — older writes and hand-edited values produce shapes the static types no longer describe.

**Guidelines:**

- MUST flag a Critical when a new read of browser-persisted data does not run a Zod `parse(…)` or `safeParse(…)` on the value before use. The project's pattern is `readStorageItem` in `src/lib/storage.ts` — schema-validated reads that treat corrupt or mismatched data as absent.
- MUST flag a Major when data a user expects to keep (a saved deck) is silently discarded on a schema mismatch with no migration or user-visible signal, when a lossless migration was feasible.
- MUST flag a Critical when imported deck data (e.g., a share/import feature accepting pasted JSON) reaches rendering or persistence without full schema validation.

## Rendering Pipeline Inputs

The rendering pipeline's safety argument rests entirely on where its input comes from, so a new feed path invalidates that argument even when the pipeline code is untouched.

**Guidelines:**

- MUST flag a Critical when a new code path passes user-supplied content into the rendering pipeline without going through the sanctioned loaders (the static card catalog or a schema-validated storage read — never the filesystem or arbitrary HTTP). The pipeline assumes its input came from a trusted source.
- MUST flag a Major when a new custom render node or transform reads attribute values without validating them — validate parseable inputs (e.g., `URL.canParse(href)`) before constructing the node.
