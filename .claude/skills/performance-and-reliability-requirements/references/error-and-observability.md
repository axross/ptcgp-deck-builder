# Error Handling and Observability

Apply these rules to verify the change keeps the project's error-propagation model intact. Defer the developer-facing rules to the project's observability guidelines — this file is the **reviewer's** flagging checklist. Throughout, `reportError(...)` denotes the project's error-reporting helper (`src/lib/report-error.ts`), which wraps Sentry's capture call.

## `try`/`catch` Placement

A catch block inside a nested helper decides recovery policy for callers it knows nothing about, intercepting failures before they reach the one place with enough context to handle them.

**Guidelines:**

- MUST flag a Major when a new `try`/`catch` is placed inside a nested helper rather than at the root call site (the request entry point / top-level handler / server action). The project rule per the project's observability guidelines (error-handling rules) is "let errors propagate to the root call site".
- MUST flag a Critical when a `catch` block does any of:
  - Logs without rethrowing or calling `reportError(...)` (silent error swallow)
  - Returns a default value (e.g., `return null`, `return []`) without `reportError(...)` — the failure becomes invisible
  - Writes to a bare console/stderr instead of `reportError(...)` — ad-hoc console output does not reach the error tracker in production
- MUST flag a Major when a `catch` rethrows but loses the original error (e.g., `throw new Error("something went wrong")`). Preserve the cause (e.g., `throw new Error("…", { cause: error })`) or just rethrow.

## Error-Reporting Discipline

An unreported failure leaves no production trace, so the first signal becomes a user complaint instead of an alert.

**Guidelines:**

- MUST flag a Critical when a new caught error is not reported via `reportError(...)`. The only exception is a known control-flow signal (e.g., a "not found" or redirect sentinel).
- MUST flag a Major when `reportError(...)` is called **after** an early return / "not found" / redirect rather than before. The report must be sent before the function exits along the alternate path.
- MUST flag a Major when the error-reporting call is imported from the wrong SDK entry point for the runtime (server vs. browser vs. edge). Use the integration that wires all runtimes correctly.
- MUST flag a Major when an unexpected non-thrown state is silently ignored. Construct and report an explicit error for "should-not-happen" branches instead of swallowing them.

## Console Output Hygiene

Console output is retained by the hosting platform and readable by far more people and systems than the code path that produced it, so a secret logged once is a secret widely distributed.

**Guidelines:**

- MUST flag a Critical when console output interpolates a secret (token, password, session ID, full request body). Cross-reference with the project's application-security requirements (secret-handling rules).
- MUST flag a Major when a `console.error` is used for a real error instead of `reportError(...)` — ad-hoc console output does not reach Sentry in production.

## Error Boundaries

Errors reaching the root boundary are precisely the ones nothing else caught, so its reporting hook is the difference between a recorded failure and a silent one.

**Guidelines:**

- MUST flag a Critical when the diff removes the error-reporting call from the project's root/last-resort error boundary — it is the final error sink.
- MUST flag a Major when a new localized error boundary is added without the same error-reporting pattern.
- MUST flag a Major when a "not found" boundary reports an error — a "not found" outcome is a normal control-flow path, not an error. Reporting it would mask real errors with noise.

## Replay and Trace Sampling

Sampling decisions are made before anyone knows which session will error, and a replay that was never captured cannot be reconstructed afterward.

**Guidelines:**

- MUST flag a Critical when the diff lowers error-time replay capture below full sampling. Error-time replay is the most diagnostic signal.
- SHOULD flag a Minor recommendation to lower the trace sampling rate when a new high-traffic route is added — full sampling will hit the error tracker's quotas.

## Idempotency

Timeouts, retries, and impatient users mean every mutation handler eventually runs twice for a single intended action.

**Guidelines:**

- MUST flag a Critical when a new mutation handler is not idempotent (a retry produces a different result) and the caller does not handle the partial-failure case. Design retries to be safe.
- SHOULD flag a Major when a new external `fetch`/network call inside a server function lacks a timeout (e.g., an abort signal with a deadline). A hung dependency stalls the entire request.
