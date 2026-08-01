"use server";

import { updateTag } from "next/cache";
import {
  ListingCoreSchema,
  ListingStatusSchema,
  type Listing,
  type ListingCore,
} from "@/schemas/listing";
import {
  createListing,
  deleteListing,
  getActiveListings,
  getActiveListingsByIds,
  listMyListings,
  setListingStatus,
  updateListing,
} from "@/lib/services/listings";
import { toResult, type ActionResult } from "./result";

/* ============================================================
   Listing entry points for the owner dashboard.

   Every cached read of a listing carries the "listings" tag
   (getActiveListings, getListingById, getSimilarListings,
   getListingsByOwner and the landing showcases), so one
   updateTag here is what makes a write visible to the public
   pages instead of leaving them stale for the cacheLife window.

   This replaces the old `revalidateListings()`, which any
   signed-in user could call to flush the site-wide tag, and which
   callers fired-and-forgot so a failed bust passed silently. A
   cache flush is now a consequence of a write that succeeded,
   not something a client can ask for.
   ============================================================ */

/** Expire every cached listing read. Called only after a write succeeds. */
function expireListingCaches() {
  updateTag("listings");
}

/** Every listing the caller owns, drafts included. */
export async function fetchMyListings(): Promise<ActionResult<Listing[]>> {
  return toResult(listMyListings);
}

/** Every active listing. Public — reads through the cached path. */
export async function fetchActiveListings(): Promise<ActionResult<Listing[]>> {
  return toResult(getActiveListings);
}

/** Active listings for a set of ids, in the order asked for. Public. */
export async function fetchListingsByIds(
  ids: string[]
): Promise<ActionResult<Listing[]>> {
  return toResult(() => getActiveListingsByIds(ids));
}

export async function createListingAction(
  core: ListingCore,
  status: Listing["status"]
): Promise<ActionResult<Listing>> {
  const parsed = parseInput(core, status);
  if (!parsed) return { ok: false, error: "invalid" };

  const result = await toResult(() =>
    createListing(parsed.core, parsed.status)
  );
  if (result.ok) expireListingCaches();
  return result;
}

export async function updateListingAction(
  id: string,
  core: ListingCore,
  status: Listing["status"]
): Promise<ActionResult> {
  const parsed = parseInput(core, status);
  if (!parsed) return { ok: false, error: "invalid" };

  const result = await toResult(() =>
    updateListing(id, parsed.core, parsed.status)
  );
  if (!result.ok) return result;
  expireListingCaches();
  return { ok: true, data: undefined };
}

export async function setListingStatusAction(
  id: string,
  status: Listing["status"]
): Promise<ActionResult> {
  const parsedStatus = ListingStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { ok: false, error: "invalid" };

  const result = await toResult(() =>
    setListingStatus(id, parsedStatus.data)
  );
  if (!result.ok) return result;
  expireListingCaches();
  return { ok: true, data: undefined };
}

export async function deleteListingAction(
  id: string
): Promise<ActionResult> {
  const result = await toResult(() => deleteListing(id));
  if (!result.ok) return result;
  expireListingCaches();
  return { ok: true, data: undefined };
}

/* Both save paths take the same pair, so they validate it the same way. */
function parseInput(core: ListingCore, status: Listing["status"]) {
  const parsedCore = ListingCoreSchema.safeParse(core);
  const parsedStatus = ListingStatusSchema.safeParse(status);
  if (!parsedCore.success || !parsedStatus.success) return null;
  return { core: parsedCore.data, status: parsedStatus.data };
}
