/* Shared between the Saved page's selection mode and the compare view. */

/* Beyond four columns the compare table stops being readable (especially on
   mobile), so selection — and the ids honored from the URL — cap there. */
export const COMPARE_MAX = 4;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse the compare URL's `ids` param into unique listing uuids, capped at
    COMPARE_MAX. Non-uuid junk (hand-edited URLs, legacy seed ids) is dropped
    so `.in("id", …)` on a uuid column never errors. */
export function parseCompareIds(raw: string | null): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((id) => UUID_RE.test(id))
    ),
  ].slice(0, COMPARE_MAX);
}
