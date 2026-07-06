import type { ZodType } from "zod";

/**
 * Reads and validates a JSON value from a `Storage`-like store. Corrupt JSON
 * and schema mismatches (e.g. data written by an older app version) are
 * treated as absent rather than thrown, so callers always get a usable value.
 */
export function readStorageItem<T>(
  storage: Pick<Storage, "getItem">,
  key: string,
  schema: ZodType<T>,
): T | null {
  const raw = storage.getItem(key);
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(parsed);
  return result.success ? result.data : null;
}

export function writeStorageItem(
  storage: Pick<Storage, "setItem">,
  key: string,
  value: unknown,
): void {
  storage.setItem(key, JSON.stringify(value));
}
