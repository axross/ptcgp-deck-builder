# Error Tracking

Apply these rules when writing, reviewing, or modifying Sentry setup, error event capture, instrumentation files, or error context.

## Error Tracker Integration Boundaries

This project uses Sentry as its error-reporting service, initialized through the error tracker's init/config files. Sentry changes affect production diagnostics and privacy, so treat them as observability and security work.

**Guidelines:**

- MUST report errors through the project's `reportError` helper (`src/lib/report-error.ts`), which wraps Sentry's capture call; import Sentry's SDK directly only inside that helper and the instrumentation files.
- MUST consult the project's development guidelines (current-docs rules) before changing the error tracker's init/config files, source maps, or runtime options.
- MUST consult the project's application-security requirements (privacy-and-exposure rules) before adding event context, tags, user identifiers, breadcrumbs, or request data.
- SHOULD keep Sentry setup in the existing init/config files instead of scattering initialization across feature modules.

## Capturing Exceptions

Captured exceptions should represent unexpected failures or unexpected states that need investigation. Expected validation failures and normal not-found paths usually belong in control flow or logs, not the error-reporting service.

**Guidelines:**

- MUST report an error (via Sentry's capture call) whenever a caught error represents an unexpected failure that should be investigated.
- MUST report before an early return, redirect, not-found, or fallback path when the failure would otherwise disappear.
- MUST rethrow after reporting when the caller or error boundary still needs to handle the failure.
- SHOULD report non-thrown unexpected states with a descriptive `Error` object when they indicate a renderer, parser, or data-contract gap.
- MUST NOT report expected user input validation failures as exceptions unless they indicate abuse or a system defect.

## Event Context and PII

Sentry context should explain the failure without copying private content into a third-party event.

**Guidelines:**

- MUST NOT attach secrets, raw request bodies, raw user content, access tokens, non-public content, or session data to Sentry context.
- MUST treat any "send default PII" option as a privacy-sensitive setting and justify any new user, request, or identifier context.
- SHOULD prefer route names, public identifiers, operation names, feature flags, and booleans over raw content values.
- SHOULD include enough stable context to make issues actionable, such as an entity `id`, `url`, `filename`, or module name when those values are intentionally public.
