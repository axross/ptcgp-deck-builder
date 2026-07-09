"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconSelect } from "@/components/icon-select";
import { type CardFilterCriteria, cardFilterParamNames, hasActiveFilters } from "../card-filters";
import type { KindOption, RarityOption, SetOption } from "../card-view";
import { energyTypes } from "../schema";
import styles from "./card-filter-bar.module.css";
import { CardKindIcon } from "./card-kind-icon";
import { EnergyIcon } from "./energy-icon";

type CardFilterBarProps = {
  criteria: CardFilterCriteria;
  rarityOptions: readonly RarityOption[];
  kindOptions: readonly KindOption[];
  setOptions: readonly SetOption[];
};

const energyTypeOptions = energyTypes.map((type) => ({
  value: type,
  label: type,
  icon: <EnergyIcon type={type} />,
}));

/**
 * The filter controls above the grid. Selections live in the URL (shareable /
 * bookmarkable), so this client component writes them with `router.replace` —
 * the server route re-reads the params and re-filters. The name search is
 * locally controlled and mirrored into the URL so the cursor never jumps.
 * Type and Kind use the pictogram dropdown; Rarity and Set stay native
 * selects (they have no pictograms), styled alike.
 */
export function CardFilterBar({
  criteria,
  rarityOptions,
  kindOptions,
  setOptions,
}: CardFilterBarProps) {
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
        <IconSelect
          id="card-filter-type"
          label="Type"
          data-testid="card-filter-type"
          value={criteria.type ?? ""}
          placeholder="All types"
          options={energyTypeOptions}
          onChange={(value) => commitParam(cardFilterParamNames.type, value)}
        />
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
        <IconSelect
          id="card-filter-kind"
          label="Kind"
          data-testid="card-filter-kind"
          value={criteria.kind ?? ""}
          placeholder="All kinds"
          options={kindOptions.map((option) => ({
            value: option.value,
            label: option.label,
            icon: <CardKindIcon kind={option.value} />,
          }))}
          onChange={(value) => commitParam(cardFilterParamNames.kind, value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="card-filter-set">
          Set
        </label>
        <select
          id="card-filter-set"
          className={styles.select}
          data-testid="card-filter-set"
          value={criteria.set ?? ""}
          onChange={(event) => commitParam(cardFilterParamNames.set, event.target.value)}
        >
          <option value="">All sets</option>
          {setOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
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
