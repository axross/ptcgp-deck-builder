import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "PTCGP Deck Builder",
  description: "Browse Pokémon TCG Pocket cards and build, validate, and save decks.",
};

/**
 * Render edge-to-edge so the header and footer can pad for device safe areas
 * (notch, home indicator) via `env(safe-area-inset-*)`; those insets only
 * resolve to non-zero once the viewport opts into `viewport-fit=cover`.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * The root layout: renders the shared app header above and the legal footer
 * below every route's content.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppHeader />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
