import * as Sentry from "@sentry/nextjs";

/**
 * Reports an unexpected error to Sentry. Reporting is a no-op when
 * `NEXT_PUBLIC_SENTRY_DSN` is unset (local development).
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
