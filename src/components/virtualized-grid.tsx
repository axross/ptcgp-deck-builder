"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./virtualized-grid.module.css";
import { chunkIntoRows, countTemplateColumns } from "./virtualized-grid-layout";

/**
 * A window-scrolled, row-virtualized grid: only the rows near the viewport are
 * mounted, so the DOM stays bounded no matter how many items are passed in.
 *
 * The consumer's `rowClassName` owns the responsive column layout (a CSS grid
 * with `auto-fill` columns plus a `padding-bottom` acting as the inter-row
 * gap); this component reads the *resolved* column count back from the
 * rendered row, chunks items into rows of that width, and virtualizes the
 * rows. CSS therefore stays the single source of truth for the breakpoints.
 *
 * Until the first client-side measurement, `initialItemCount` items render in
 * one normal-flow grid — that is also the server-rendered HTML, so the first
 * paint shows the top of the grid without any layout math.
 */

// One overscan row above and below is cheap; three keeps fast wheel/keyboard
// scrolling and small pre-measurement offset drift from flashing blank rows.
const OVERSCAN_ROWS = 3;

// How many leading items the pre-measurement (and server-rendered) grid
// mounts: enough full rows to cover a tall viewport at the widest layouts.
const DEFAULT_INITIAL_ITEM_COUNT = 24;

type VirtualizedGridProps<Item> = {
  items: readonly Item[];
  /** Stable per-item key (e.g. the card id). */
  getItemKey: (item: Item) => string;
  /** Renders one item; `index` is the item's position in `items`. */
  renderItem: (item: Item, index: number) => ReactNode;
  /**
   * The consumer's row class: a CSS grid defining the responsive
   * `grid-template-columns`, the column `gap`, and a `padding-bottom` equal to
   * the desired row gap (rows are positioned by measured border-box height).
   */
  rowClassName: string;
  /** Estimated row height in px before a row is first measured. */
  estimatedRowHeight: number;
  /** Items mounted before the first client measurement; also the SSR window. */
  initialItemCount?: number;
  "data-testid"?: string;
};

export function VirtualizedGrid<Item>({
  items,
  getItemKey,
  renderItem,
  rowClassName,
  estimatedRowHeight,
  initialItemCount = DEFAULT_INITIAL_ITEM_COUNT,
  "data-testid": testId,
}: VirtualizedGridProps<Item>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // `null` until the rendered grid is measured; the pre-measurement phase
  // renders a plain grid so SSR and the first client paint need no math.
  const [columns, setColumns] = useState<number | null>(null);
  // Distance from the document top to the grid, mapping window scroll offsets
  // into row space (the virtualizer's scrollMargin).
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const measure = () => {
      setScrollMargin(container.getBoundingClientRect().top + window.scrollY);
      // Both phases render row elements carrying `rowClassName` as direct
      // children, so the first child always resolves the live column count.
      const row = container.firstElementChild;
      if (row !== null) {
        setColumns(countTemplateColumns(getComputedStyle(row).gridTemplateColumns));
      }
    };
    // Re-measure whenever the grid's box changes (viewport resize, zoom,
    // sidebar reflow); the observer also fires once on observe, covering the
    // initial measurement.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  const rows = columns === null ? [] : chunkIntoRows(items, columns);
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => estimatedRowHeight,
    overscan: OVERSCAN_ROWS,
    scrollMargin,
  });

  if (columns === null) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: a `ul` cannot host the virtualized phase's absolutely-positioned row wrapper divs, so the list role lives on a div in both phases.
      <div
        role="list"
        data-testid={testId}
        data-virtualized="false"
        ref={containerRef}
        className={styles.container}
      >
        <div className={rowClassName}>
          {items.slice(0, initialItemCount).map((item, index) => (
            <Fragment key={getItemKey(item)}>{renderItem(item, index)}</Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a `ul` cannot host the absolutely-positioned row wrapper divs that virtualization requires, so the list role lives on a div.
    <div
      role="list"
      data-testid={testId}
      // Flips to "true" only after hydration + the first client measurement,
      // which makes it a deterministic "page is interactive" signal for e2e.
      data-virtualized="true"
      ref={containerRef}
      className={styles.container}
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <div
          key={virtualRow.key}
          data-index={virtualRow.index}
          ref={virtualizer.measureElement}
          className={`${styles.virtualRow} ${rowClassName}`}
          // `start` is in document space (it includes scrollMargin); rows are
          // positioned relative to the container, so subtract it back out.
          style={{ transform: `translateY(${virtualRow.start - scrollMargin}px)` }}
        >
          {rows[virtualRow.index].map((item, indexInRow) => {
            const index = virtualRow.index * columns + indexInRow;
            return <Fragment key={getItemKey(item)}>{renderItem(item, index)}</Fragment>;
          })}
        </div>
      ))}
    </div>
  );
}
