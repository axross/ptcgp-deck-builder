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

/**
 * Writes a value as JSON to a `Storage`-like store. Returns `false` when the
 * store rejects the write (e.g. `QuotaExceededError` when storage is full or
 * in some private-browsing modes) so callers can surface the failure instead
 * of crashing.
 *
 * @throws {TypeError} when `value` is not JSON-serializable (e.g. `undefined`),
 *   which is a programming error, not a storage condition.
 */
export function writeStorageItem(
  storage: Pick<Storage, "setItem">,
  key: string,
  value: unknown,
): boolean {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError(
      `writeStorageItem() was called with a non-serializable value for "${key}".`,
    );
  }
  try {
    storage.setItem(key, serialized);
  } catch {
    return false;
  }
  return true;
}
