"use client";

import { useMemo, useState } from "react";
import { IconSelect } from "@/components/icon-select";
import { VirtualizedGrid } from "@/components/virtualized-grid";
import { type CardKind, cardKindLabels, cardKinds } from "@/features/cards/card-filters";
import { CardImage } from "@/features/cards/components/card-image";
import { CardKindIcon } from "@/features/cards/components/card-kind-icon";
import { energyTypeOptions } from "@/features/cards/components/energy-icon";
import type { EnergyType } from "@/features/cards/schema";
import { type DeckBuilderCard, deckBuilderCardKind } from "../deck-card";
import { filterPickerCards, type PickerCriteria } from "../deck-card-search";
import { MAX_COPIES_PER_NAME } from "../deck-rules";
import { useDeckStore } from "../store-context";
import styles from "./deck-card-picker.module.css";

/**
 * The card picker: the browsing/search half of the editor. Filters the catalog
 * projection in memory and offers each card an add control that respects the
 * copy-limit-by-name at interaction time.
 */

// Eager-load roughly the first grid row so the top of the picker isn't
// lazy-loaded; the rest load as they scroll into view.
const PRIORITY_TILE_COUNT = 12;

// A picker tile is the card image (portrait 245:342 at up to ~7rem plus a 1fr
// share) with a name line and an add button; the virtualizer replaces this
// estimate with measured row heights after the first paint.
const ESTIMATED_ROW_HEIGHT = 240;

type DeckCardPickerProps = {
  catalog: DeckBuilderCard[];
};

function resultCountLabel(count: number): string {
  return count === 1 ? "1 card" : `${count} cards`;
}

export function DeckCardPicker({ catalog }: DeckCardPickerProps) {
  const [criteria, setCriteria] = useState<PickerCriteria>({});
  const filtered = useMemo(() => filterPickerCards(catalog, criteria), [catalog, criteria]);

  // Offer only the kinds the catalog actually contains, in canonical order,
  // so an unseeded kind (e.g. Fossil today) never appears as a dead option.
  const kindOptions = useMemo(() => {
    const present = new Set(catalog.map(deckBuilderCardKind));
    return cardKinds
      .filter((kind) => present.has(kind))
      .map((kind) => ({
        value: kind,
        label: cardKindLabels[kind],
        icon: <CardKindIcon kind={kind} />,
      }));
  }, [catalog]);

  function update(patch: PickerCriteria) {
    setCriteria((current) => {
      const next = { ...current, ...patch };
      for (const key of Object.keys(next) as (keyof PickerCriteria)[]) {
        if (next[key] === undefined || next[key] === "") {
          delete next[key];
        }
      }
      return next;
    });
  }

  return (
    <section className={styles.picker} data-testid="deck-card-picker" aria-label="Card picker">
      <div className={styles.filters} data-testid="deck-picker-filters">
        <div className={styles.field}>
          <label className={styles.label} htmlFor="deck-picker-search">
            Search
          </label>
          <input
            id="deck-picker-search"
            className={styles.input}
            data-testid="deck-picker-search"
            type="search"
            placeholder="Card name"
            value={criteria.query ?? ""}
            onChange={(event) => update({ query: event.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="deck-picker-type">
            Type
          </label>
          <IconSelect
            id="deck-picker-type"
            label="Type"
            data-testid="deck-picker-type"
            value={criteria.type ?? ""}
            placeholder="All types"
            options={energyTypeOptions}
            onChange={(value) => update({ type: (value || undefined) as EnergyType })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="deck-picker-kind">
            Kind
          </label>
          <IconSelect
            id="deck-picker-kind"
            label="Kind"
            data-testid="deck-picker-kind"
            value={criteria.kind ?? ""}
            placeholder="All kinds"
            options={kindOptions}
            onChange={(value) => update({ kind: (value || undefined) as CardKind })}
          />
        </div>
      </div>

      <p className={styles.resultCount} data-testid="deck-picker-count" aria-live="polite">
        {resultCountLabel(filtered.length)}
      </p>

      {filtered.length > 0 ? (
        <VirtualizedGrid
          items={filtered}
          getItemKey={(card) => card.id}
          className={styles.grid}
          rowClassName={styles.row}
          estimatedRowHeight={ESTIMATED_ROW_HEIGHT}
          data-testid="deck-picker-grid"
          renderItem={(card, index) => (
            <PickerTile card={card} priority={index < PRIORITY_TILE_COUNT} />
          )}
        />
      ) : (
        <p className={styles.empty} data-testid="deck-picker-empty">
          No cards match this search.
        </p>
      )}
    </section>
  );
}

type PickerTileProps = {
  card: DeckBuilderCard;
  /** Eager-load the first tiles so the top of the picker isn't lazy-loaded. */
  priority?: boolean;
};

function PickerTile({ card, priority }: PickerTileProps) {
  const copies = useDeckStore((state) => state.copiesByName[card.name] ?? 0);
  const addCard = useDeckStore((state) => state.addCard);
  const atLimit = copies >= MAX_COPIES_PER_NAME;

  const limitHint = `You already have ${MAX_COPIES_PER_NAME} “${card.name}” — a deck allows at most ${MAX_COPIES_PER_NAME} copies per card name.`;

  return (
    // biome-ignore lint/a11y/useSemanticElements: the virtualized grid's list role lives on a div (its rows preclude `ul`/`li`), so the item role does too.
    <div
      role="listitem"
      className={styles.tile}
      data-testid="deck-picker-tile"
      data-card-id={card.id}
    >
      <div className={styles.tileImage}>
        <CardImage
          src={card.imageUrl}
          alt={card.name}
          priority={priority}
          fallback={{
            name: card.name,
            typeLabel: card.typeLabel,
            kindLabel: card.kindLabel,
            hp: card.hp,
          }}
        />
        {copies > 0 ? (
          <span className={styles.copyBadge} data-testid="deck-picker-copies" aria-hidden="true">
            ×{copies}
          </span>
        ) : null}
      </div>
      <span className={styles.tileName}>{card.name}</span>
      <button
        type="button"
        className={styles.addButton}
        data-testid="deck-picker-add"
        onClick={() => addCard(card.id)}
        disabled={atLimit}
        aria-label={
          atLimit ? limitHint : `Add ${card.name}${copies > 0 ? ` (${copies} in deck)` : ""}`
        }
        title={atLimit ? limitHint : undefined}
      >
        {atLimit ? "Max 2" : "Add"}
      </button>
    </div>
  );
}
