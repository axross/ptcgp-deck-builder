# Privacy and Exposure Control

Apply these rules when reviewing whether a change exposes content, identifiers, environment values, or error context beyond the intended audience.

## Public Content Boundaries

Every route in this project is public: the card catalog, deck-building UI, metadata, and search/discovery files are all served to anonymous visitors, and user decks live only in each visitor's own browser storage. Secrets and operational identifiers are not public just because the app has no private routes.

**Guidelines:**

- MUST flag a Major when a public response exposes stack traces, internal identifiers, or environment-derived values that are not required for the user-facing feature.
- MUST flag a Critical when sitemap, robots, structured data (e.g., JSON-LD), social-preview (Open Graph) image routes, or generated page metadata expose values that are not intentionally public.
- MUST treat a user's saved decks as device-local data: flag any change that transmits deck contents or other browser-persisted state to a server or third party without an explicit, user-visible feature requiring it.

## Client and Environment Exposure

Values sent to the browser/client are public. The framework's public/client-exposed env-var prefix is a release decision, not only a typing convenience.

**Guidelines:**

- MUST flag any newly exposed client-prefixed env value unless it is safe for every visitor to read.
- MUST flag a Critical when secrets, tokens, DSNs with auth tokens, admin emails, session values, or database URLs can reach client bundles, HTML, metadata, logs, or third-party payloads.
- MUST verify `process.env.*` access remains limited to the env-access files allowed by [secret-handling](./secret-handling.md).
- SHOULD ask for a narrower public value when a client component only needs a derived boolean or public identifier.

## Error Reporting Exposure

Sentry is a third-party data processor. Event context should be useful for debugging without carrying raw private content.

**Guidelines:**

- MUST flag a Major when Sentry context includes secrets, raw request bodies, raw user content (e.g., full deck contents or user-entered deck names), or access tokens — including extra context passed through `reportError(error, { … })`.
- MUST treat a "send default PII" option in the Sentry config as a privacy-sensitive default and require explicit justification when adding identifiers to its context; with session replay enabled, Sentry can also capture DOM mutations including form input, so any input capturing sensitive values needs the SDK's input masking.
- SHOULD prefer stable non-sensitive identifiers such as route names, card identifiers, feature names, and boolean state over raw content values.
- SHOULD flag a Minor recommendation to scope the trace sample rate below `1` when a new high-traffic route is introduced, to control Sentry quota.

## Localhost / Production Divergence

Code gated to the local environment escapes every production test and review scenario, so its divergence from the production path surfaces only after deployment.

**Guidelines:**

- MUST flag a Major when the diff causes a code path to execute only when running locally (per the project's environment flag) but no equivalent exists for production — a localhost-only gate that ships to production via a deployed branch is a recurring class of bug.
