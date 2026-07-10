import type { Metadata } from "next";
import Link from "next/link";
import { filterCards, hasActiveFilters, parseCardFilters } from "@/features/cards/card-filters";
import {
  deriveKindOptions,
  deriveRarityOptions,
  deriveSetOptions,
  toCardTileView,
} from "@/features/cards/card-view";
import { getAllCards } from "@/features/cards/catalog";
import { CardFilterBar } from "@/features/cards/components/card-filter-bar";
import { CardGrid } from "@/features/cards/components/card-grid";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Cards",
  description: "Browse and filter the Pokémon TCG Pocket card catalog.",
};

type CardsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resultCountLabel(count: number): string {
  return count === 1 ? "1 card" : `${count} cards`;
}

/**
 * Server-rendered `/cards` route: reads the URL search params, parses them into
 * validated filter criteria, filters the catalog, and renders the filter bar
 * with either the card grid or the empty state.
 */
export default async function CardsPage({ searchParams }: CardsPageProps) {
  const rawParams = await searchParams;
  const cards = getAllCards();
  const rarityOptions = deriveRarityOptions(cards);
  const kindOptions = deriveKindOptions(cards);
  const setOptions = deriveSetOptions(cards);
  const criteria = parseCardFilters(rawParams, {
    rarityCodes: rarityOptions.map((option) => option.code),
    setCodes: setOptions.map((option) => option.code),
  });

  const filtered = filterCards(cards, criteria);
  const views = filtered.map(toCardTileView);

  return (
    <main className={styles.main} data-testid="cards-page">
      <h1 className={styles.heading}>Cards</h1>

      <CardFilterBar
        criteria={criteria}
        rarityOptions={rarityOptions}
        kindOptions={kindOptions}
        setOptions={setOptions}
      />

      <p className={styles.resultCount} data-testid="card-result-count" aria-live="polite">
        {resultCountLabel(views.length)}
      </p>

      {views.length > 0 ? (
        <CardGrid cards={views} />
      ) : (
        <div className={styles.empty} data-testid="cards-empty-state">
          <p className={styles.emptyMessage}>No cards match these filters.</p>
          {hasActiveFilters(criteria) ? (
            <Link className={styles.emptyAction} href="/cards" data-testid="cards-empty-clear">
              Clear filters
            </Link>
          ) : null}
        </div>
      )}
    </main>
  );
}
