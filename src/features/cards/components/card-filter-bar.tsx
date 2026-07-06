"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type CardFilterCriteria,
  cardFilterParamNames,
  cardKindLabels,
  cardKinds,
  hasActiveFilters,
} from "../card-filters";
import type { RarityOption } from "../card-view";
import { energyTypes } from "../schema";
import styles from "./card-filter-bar.module.css";

type CardFilterBarProps = {
  criteria: CardFilterCriteria;
  rarityOptions: readonly RarityOption[];
};

/**
 * The filter controls above the grid. Selections live in the URL (shareable /
 * bookmarkable), so this client component writes them with `router.replace` —
 * the server route re-reads the params and re-filters. The name search is
 * locally controlled and mirrored into the URL so the cursor never jumps.
 */
export function CardFilterBar({ criteria, rarityOptions }: CardFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The text input is controlled locally for responsiveness; keep it in sync
  // when the URL changes underneath us (browser back/forward, "clear filters").
  const [query, setQuery] = useState(criteria.query ?? "");
  useEffect(() => {
    setQuery(criteria.query ?? "");
  }, [criteria.query]);

  function commitParam(name: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "") {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    const search = next.toString();
    router.replace(search === "" ? pathname : `${pathname}?${search}`);
  }

  function clearAll() {
    setQuery("");
    router.replace(pathname);
  }

  return (
    <div className={styles.bar} data-testid="card-filters">
      <div className={styles.field}>
        <label className={styles.label} htmlFor="card-filter-type">
          Type
        </label>
        <select
          id="card-filter-type"
          className={styles.select}
          data-testid="card-filter-type"
          value={criteria.type ?? ""}
          onChange={(event) => commitParam(cardFilterParamNames.type, event.target.value)}
        >
          <option value="">All types</option>
          {energyTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="card-filter-rarity">
          Rarity
        </label>
        <select
          id="card-filter-rarity"
          className={styles.select}
          data-testid="card-filter-rarity"
          value={criteria.rarity ?? ""}
          onChange={(event) => commitParam(cardFilterParamNames.rarity, event.target.value)}
        >
          <option value="">All rarities</option>
          {rarityOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="card-filter-kind">
          Kind
        </label>
        <select
          id="card-filter-kind"
          className={styles.select}
          data-testid="card-filter-kind"
          value={criteria.kind ?? ""}
          onChange={(event) => commitParam(cardFilterParamNames.kind, event.target.value)}
        >
          <option value="">All kinds</option>
          {cardKinds.map((kind) => (
            <option key={kind} value={kind}>
              {cardKindLabels[kind]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="card-filter-search">
          Search
        </label>
        <input
          id="card-filter-search"
          className={styles.input}
          data-testid="card-filter-search"
          type="search"
          placeholder="Card name"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            commitParam(cardFilterParamNames.query, event.target.value);
          }}
        />
      </div>

      {hasActiveFilters(criteria) ? (
        <button
          type="button"
          className={styles.clear}
          data-testid="card-filter-clear"
          onClick={clearAll}
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
