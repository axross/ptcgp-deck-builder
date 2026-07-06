/**
 * Shared Sentry init options for both instrumentation entry points
 * (instrumentation.ts and instrumentation-client.ts), so sampling and
 * enablement cannot silently diverge between server and client. All values
 * are client-safe (`NEXT_PUBLIC_` env only).
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
};
