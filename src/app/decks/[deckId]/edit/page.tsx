import type { Metadata } from "next";
import { getAllCards } from "@/features/cards/catalog";
import { DeckEditor } from "@/features/decks/components/deck-editor";
import { toDeckBuilderCard } from "@/features/decks/deck-card";

export const metadata: Metadata = {
  title: "Edit deck",
  description: "Edit a saved Pokémon TCG Pocket deck.",
};

type EditDeckPageProps = {
  params: Promise<{ deckId: string }>;
};

/**
 * `/decks/[deckId]/edit`: the deck editor for a saved deck. The deck itself
 * lives in the browser, so the client editor loads it from `localStorage`;
 * this server component only supplies the catalog projection.
 */
export default async function EditDeckPage({ params }: EditDeckPageProps) {
  const { deckId } = await params;
  const catalog = getAllCards().map(toDeckBuilderCard);
  return <DeckEditor catalog={catalog} mode="edit" deckId={deckId} />;
}
