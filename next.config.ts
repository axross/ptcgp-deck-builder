import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  // Source-map upload only runs when SENTRY_AUTH_TOKEN / SENTRY_ORG /
  // SENTRY_PROJECT are set (e.g. on Vercel); local builds skip it.
  silent: true,
});
