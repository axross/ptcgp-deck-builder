import type { Metadata } from "next";
import { getAllCards } from "@/features/cards/catalog";
import { DeckList } from "@/features/decks/components/deck-list";
import { toDeckBuilderCard } from "@/features/decks/deck-card";

export const metadata: Metadata = {
  title: "Decks",
  description: "View, open, and delete the Pokémon TCG Pocket decks saved in your browser.",
};

/**
 * `/decks`: the saved-deck list. Decks are browser-persisted, so the list is a
 * client component; this server route only reads the catalog (server-only) and
 * hands over the lightweight projection the legality summary needs.
 */
export default function DecksPage() {
  const catalog = getAllCards().map(toDeckBuilderCard);
  return <DeckList catalog={catalog} />;
}
