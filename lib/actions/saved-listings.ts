"use server";

import { z } from "zod";
import { getLocale } from "next-intl/server";
import { filtersSchema, type Filters, type SortKey } from "@/schemas/filters";
import {
  getSavedFacets,
  getSavedListingsPage,
  listMySavedIds,
  mergeGuestSaved,
  setSaved,
} from "@/lib/services/saved-listings";
import type {
  SavedFacets,
  SavedListingsPage,
} from "@/hooks/saved-listings-keys";
import { localizeListings } from "@/schemas/listing";
import { toResult, type ActionResult } from "./result";

/* ============================================================
   Saved-page entry points.

   The shortlist ids are an argument rather than something the
   server derives, because guests have no rows to derive from —
   theirs live in localStorage. That's safe: they only ever
   narrow a query over public active listings. It does mean the
   list needs a bound, hence the cap below.
   ============================================================ */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Generous — well past any real shortlist — but finite, so a crafted request
   can't ask the database for an unbounded `in (…)`. */
const savedIdsSchema = z.array(z.string().regex(UUID_RE)).max(500);

const pageInputSchema = z.object({
  saved: savedIdsSchema,
  filters: filtersSchema,
  sort: z.enum(["featured", "newest", "low", "high", "area"]),
  page: z.number().int().min(1).max(1000),
});

/** One filtered, sorted, paginated page of the shortlist.

    Filtering happens in SQL, before this resolves the copy — same ordering as
    browse, and for the same reason: the page's `q` has to be able to match a
    language the reader isn't currently being shown. */
export async function fetchSavedListingsPage(input: {
  saved: string[];
  filters: Filters;
  sort: SortKey;
  page: number;
}): Promise<ActionResult<SavedListingsPage>> {
  const parsed = pageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const locale = await getLocale();
  return toResult(async () => {
    const page = await getSavedListingsPage(parsed.data);
    return { ...page, listings: localizeListings(page.listings, locale) };
  });
}

/** Districts and total for the shortlist, independent of filters and paging. */
export async function fetchSavedFacets(
  saved: string[]
): Promise<ActionResult<SavedFacets>> {
  const parsed = savedIdsSchema.safeParse(saved);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return toResult(() => getSavedFacets(parsed.data));
}

/** The caller's saved listing ids, most recently saved first. */
export async function fetchMySavedIds(): Promise<ActionResult<string[]>> {
  return toResult(listMySavedIds);
}

/** Add or remove one listing from the caller's shortlist. */
export async function setSavedAction(
  listingId: string,
  next: boolean
): Promise<ActionResult> {
  if (!UUID_RE.test(listingId)) return { ok: false, error: "invalid" };
  return toResult(() => setSaved(listingId, next));
}

/** Fold a guest's localStorage shortlist into the caller's rows on sign-in. */
export async function mergeGuestSavedAction(
  listingIds: string[]
): Promise<ActionResult> {
  const parsed = savedIdsSchema.safeParse(listingIds);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return toResult(() => mergeGuestSaved(parsed.data));
}
