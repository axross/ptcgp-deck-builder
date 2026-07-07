/**
 * The registry of PTCGP expansion sets — the single source of set metadata for
 * the whole app. Sourced from the ptcgp-domain skill's expansions reference
 * (.claude/skills/ptcgp-domain/references/expansions.md §4).
 *
 * The registry lists every *published* set (A1 through B3b) so ordering,
 * labels, and coverage assertions work even before a set's card data is seeded
 * under `data/`. It is deliberately *not* `server-only`: it is small metadata
 * that client components (e.g. the set filter) may import directly rather than
 * hardcoding set names. Card data itself stays server-tier (see catalog.ts).
 *
 * Not included: the upcoming B4 (Ruler of the Skies — card count still TBA) and
 * the Promo sets (P-A / P-B), which are an open product question. Add a row
 * here when a set is published; see the skill's "Adding a New Expansion's Data".
 */

/** A published expansion set's metadata. */
export type PtcgpSet = {
  /** In-game series code, e.g. "A1", "A1a", "B2b". Globally unique. */
  code: string;
  /** Official English name, e.g. "Genetic Apex". */
  name: string;
  /** Official Japanese name — not a translation of `name` (both are official). */
  nameJa: string;
  /** Worldwide release date, ISO `YYYY-MM-DD`. */
  releaseDate: string;
  /** Total cards printed in the set (base + secret), per the expansions reference. */
  cardCount: number;
};

/**
 * Every published set, in chronological (release) order. Keep in sync with the
 * expansions reference; the order here is the canonical set ordering used for
 * labels and filter controls.
 */
export const sets = [
  {
    code: "A1",
    name: "Genetic Apex",
    nameJa: "最強の遺伝子",
    releaseDate: "2024-10-30",
    cardCount: 286,
  },
  {
    code: "A1a",
    name: "Mythical Island",
    nameJa: "幻のいる島",
    releaseDate: "2024-12-17",
    cardCount: 86,
  },
  {
    code: "A2",
    name: "Space-Time Smackdown",
    nameJa: "時空の激闘",
    releaseDate: "2025-01-30",
    cardCount: 207,
  },
  {
    code: "A2a",
    name: "Triumphant Light",
    nameJa: "超克の光",
    releaseDate: "2025-02-28",
    cardCount: 96,
  },
  {
    code: "A2b",
    name: "Shining Revelry",
    nameJa: "シャイニングハイ",
    releaseDate: "2025-03-27",
    cardCount: 111,
  },
  {
    code: "A3",
    name: "Celestial Guardians",
    nameJa: "双天の守護者",
    releaseDate: "2025-04-30",
    cardCount: 239,
  },
  {
    code: "A3a",
    name: "Extradimensional Crisis",
    nameJa: "異次元クライシス",
    releaseDate: "2025-05-29",
    cardCount: 103,
  },
  {
    code: "A3b",
    name: "Eevee Grove",
    nameJa: "イーブイガーデン",
    releaseDate: "2025-06-26",
    cardCount: 107,
  },
  {
    code: "A4",
    name: "Wisdom of Sea and Sky",
    nameJa: "空と海の導き",
    releaseDate: "2025-07-30",
    cardCount: 241,
  },
  {
    code: "A4a",
    name: "Secluded Springs",
    nameJa: "未知なる水域",
    releaseDate: "2025-08-28",
    cardCount: 105,
  },
  {
    code: "A4b",
    name: "Deluxe Pack: ex",
    nameJa: "デラックスパックex",
    releaseDate: "2025-09-30",
    cardCount: 379,
  },
  {
    code: "B1",
    name: "Mega Rising",
    nameJa: "メガライジング",
    releaseDate: "2025-10-30",
    cardCount: 331,
  },
  {
    code: "B1a",
    name: "Crimson Blaze",
    nameJa: "紅蓮ブレイズ",
    releaseDate: "2025-12-17",
    cardCount: 103,
  },
  {
    code: "B2",
    name: "Fantastical Parade",
    nameJa: "夢幻パレード",
    releaseDate: "2026-01-29",
    cardCount: 234,
  },
  {
    code: "B2a",
    name: "Paldean Wonders",
    nameJa: "パルデアワンダー",
    releaseDate: "2026-02-26",
    cardCount: 131,
  },
  {
    code: "B2b",
    name: "Mega Shine",
    nameJa: "シャイニングメガ",
    releaseDate: "2026-03-26",
    cardCount: 117,
  },
  {
    code: "B3",
    name: "Pulsing Aura",
    nameJa: "波動ビート",
    releaseDate: "2026-04-28",
    cardCount: 234,
  },
  {
    code: "B3a",
    name: "Paradox Drive",
    nameJa: "進撃パラドックス",
    releaseDate: "2026-05-28",
    cardCount: 109,
  },
  {
    code: "B3b",
    name: "Everyday Wonders",
    nameJa: "ミラクルデイズ",
    releaseDate: "2026-06-30",
    cardCount: 106,
  },
] as const satisfies readonly PtcgpSet[];

/** A published set's code — the union of every code in {@link sets}. */
export type SetCode = (typeof sets)[number]["code"];

const byCode: ReadonlyMap<string, PtcgpSet> = new Map(sets.map((set) => [set.code, set]));

/** Every published set code, in chronological order. */
export const setCodes: readonly SetCode[] = sets.map((set) => set.code);

/** Returns the set with the given code, or null when the code is unknown. */
export function getSet(code: string): PtcgpSet | null {
  return byCode.get(code) ?? null;
}

/** True when `code` names a published set in the registry. */
export function isKnownSetCode(code: string): code is SetCode {
  return byCode.has(code);
}
