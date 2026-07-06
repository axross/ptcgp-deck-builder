import type { Metadata } from "next";
import { getAllCards } from "@/features/cards/catalog";
import { DeckEditor } from "@/features/decks/components/deck-editor";
import { toDeckBuilderCard } from "@/features/decks/deck-card";

export const metadata: Metadata = {
  title: "New deck",
  description: "Build a 20-card Pokémon TCG Pocket deck and save it in your browser.",
};

/**
 * `/decks/new`: the deck editor for a fresh deck. The server reads the catalog
 * (server-only) and hands the client editor a lightweight per-card projection.
 */
export default function NewDeckPage() {
  const catalog = getAllCards().map(toDeckBuilderCard);
  return <DeckEditor catalog={catalog} mode="new" />;
}
