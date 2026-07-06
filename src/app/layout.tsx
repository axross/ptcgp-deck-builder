import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "PTCGP Deck Builder",
  description: "Browse Pokémon TCG Pocket cards and build, validate, and save decks.",
};

/** The root layout: renders the shared app header above every route's content. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
