import { z } from "zod";

/* ============================================================
   Saved-search domain schema (improvement #3).
   A saved search is a named browse query string plus an email
   alert flag — no separate filter model; the URL params are the
   canonical serialization (see apartments/lib/saved-search.ts).
   ============================================================ */

/* Per-user cap — keeps the publish-time matching loop trivially cheap.
   Mirrored by the enforce_saved_search_cap DB trigger. */
export const SAVED_SEARCH_MAX = 10;

export const savedSearchSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Browse URL query string ("type=Apartment&district=hai-chau&maxPrice=2000").
  queryString: z.string(),
  alerts: z.boolean(),
  createdAt: z.string(),
});
export type SavedSearch = z.infer<typeof savedSearchSchema>;

/* Save-dialog form — the name field only; alerts is a toggle, not an input.
   Built from a translator (validation namespace) like the other form schemas. */
export const createSaveSearchSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t("savedSearch.name")).max(80),
  });
export type SaveSearchValues = z.infer<
  ReturnType<typeof createSaveSearchSchema>
>;
