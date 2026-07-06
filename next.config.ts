import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { CARD_IMAGE_BASE_URL } from "./src/features/cards/card-images";

const cardImageCdn = new URL(CARD_IMAGE_BASE_URL);

const nextConfig: NextConfig = {
  images: {
    // Card artwork host, derived from the single provider constant so a
    // provider swap cannot leave this allowlist stale; tightly scoped to the
    // Pocket path. See src/features/cards/card-images.ts.
    remotePatterns: [
      {
        protocol: "https",
        hostname: cardImageCdn.hostname,
        pathname: `${cardImageCdn.pathname}/**`,
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Source-map upload only runs when SENTRY_AUTH_TOKEN / SENTRY_ORG /
  // SENTRY_PROJECT are set (e.g. on Vercel); local builds skip it.
  silent: true,
});
