import { describe, expect, it } from "vitest";
import { chunkIntoRows, countTemplateColumns } from "./virtualized-grid-layout";

describe("countTemplateColumns()", () => {
  it("counts the tracks in a resolved pixel track list", () => {
    expect(countTemplateColumns("168px 168px 168px")).toBe(3);
  });

  it("tolerates fractional track sizes and extra whitespace", () => {
    expect(countTemplateColumns("  150.25px  150.25px ")).toBe(2);
  });

  it("treats a single track as one column", () => {
    expect(countTemplateColumns("320px")).toBe(1);
  });

  it("falls back to one column when the element is not a grid (computed 'none')", () => {
    expect(countTemplateColumns("none")).toBe(1);
  });

  it("falls back to one column for an empty value", () => {
    expect(countTemplateColumns("")).toBe(1);
  });
});

describe("chunkIntoRows()", () => {
  it("chunks items into full rows with a shorter final row", () => {
    expect(chunkIntoRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single row when the column count exceeds the item count", () => {
    expect(chunkIntoRows([1, 2], 4)).toEqual([[1, 2]]);
  });

  it("returns no rows for no items", () => {
    expect(chunkIntoRows([], 3)).toEqual([]);
  });

  it("never divides by zero: a column count below one chunks one per row", () => {
    expect(chunkIntoRows([1, 2], 0)).toEqual([[1], [2]]);
  });
});
