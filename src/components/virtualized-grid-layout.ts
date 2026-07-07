/**
 * Pure layout math for {@link VirtualizedGrid}: deriving the column count from
 * the browser's resolved `grid-template-columns` and chunking a flat item list
 * into rows of that width. Kept as plain functions so the windowing arithmetic
 * is unit-testable without a DOM.
 */

/**
 * Counts the column tracks in a *computed* `grid-template-columns` value
 * (a resolved track list such as `"168px 168px 168px"`). `"none"` — the
 * computed value when the element is not a grid — counts as a single column,
 * as does an empty string, so callers can always chunk safely.
 */
export function countTemplateColumns(computedTemplate: string): number {
  const tracks = computedTemplate
    .trim()
    .split(/\s+/)
    .filter((track) => track.length > 0 && track !== "none");
  return Math.max(1, tracks.length);
}

/** Chunks `items` into consecutive rows of `columns` items (the last row may be shorter). */
export function chunkIntoRows<Item>(items: readonly Item[], columns: number): Item[][] {
  const width = Math.max(1, Math.floor(columns));
  const rows: Item[][] = [];
  for (let start = 0; start < items.length; start += width) {
    rows.push(items.slice(start, start + width));
  }
  return rows;
}
