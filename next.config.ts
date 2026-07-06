import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Card artwork host; tightly scoped to the Pocket path. See
    // src/features/cards/card-images.ts and the ptcgp-domain skill.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com",
        pathname: "/pocket/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Source-map upload only runs when SENTRY_AUTH_TOKEN / SENTRY_ORG /
  // SENTRY_PROJECT are set (e.g. on Vercel); local builds skip it.
  silent: true,
});
