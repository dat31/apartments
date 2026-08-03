"use server";

import { getLocale } from "next-intl/server";

import {
  bookTourSchema,
  proposeSlotSchema,
  type BookTourInput,
  type TourRequest,
} from "@/schemas/tour";
import {
  acceptReschedule,
  acceptTour,
  bookTour,
  declineTour,
  getActiveTour,
  listAttachableTours,
  listTours,
  proposeTourTime,
  type TourScope,
  type TourWithListing,
} from "@/lib/services/tours";
import { localizeListing } from "@/schemas/listing";
import { toResult, type ActionResult } from "./result";

/* ============================================================
   Tour entry points.

   Nothing here expires a server cache: tours are per-user data
   read through these actions, never through a "use cache"
   boundary, so react-query invalidation on the client is the
   whole story.
   ============================================================ */

/** The caller's tours as renter or as owner.

    The joined listing carries the copy the tour cards render, so it is
    resolved here — the same job a page boundary does for server-rendered
    listings. A tour whose listing has since been deleted keeps its null. */
export async function fetchTours(
  scope: TourScope
): Promise<ActionResult<TourWithListing[]>> {
  const locale = await getLocale();
  return toResult(async () =>
    (await listTours(scope)).map((row) => ({
      ...row,
      listing: row.listing ? localizeListing(row.listing, locale) : null,
    }))
  );
}

/** The caller's live tour for one listing, or null. */
export async function fetchActiveTour(
  listingId: string
): Promise<ActionResult<TourRequest | null>> {
  return toResult(() => getActiveTour(listingId));
}

/** Tours a thread between the caller and `otherUserId` may attach. */
export async function fetchAttachableTours(
  listingId: string,
  otherUserId: string
): Promise<ActionResult<TourRequest[]>> {
  return toResult(() => listAttachableTours(listingId, otherUserId));
}

export async function bookTourAction(
  input: BookTourInput
): Promise<ActionResult<TourRequest>> {
  const parsed = bookTourSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return toResult(() => bookTour(parsed.data));
}

/** Owner confirms the requested slot. */
export async function acceptTourAction(id: string): Promise<ActionResult> {
  return voidResult(await toResult(() => acceptTour(id)));
}

/** Either party declines or cancels. */
export async function declineTourAction(id: string): Promise<ActionResult> {
  return voidResult(await toResult(() => declineTour(id)));
}

/** Owner proposes an alternative slot. */
export async function proposeTourTimeAction(
  id: string,
  date: string,
  time: string
): Promise<ActionResult> {
  const parsed = proposeSlotSchema.safeParse({ date, time });
  if (!parsed.success) return { ok: false, error: "invalid" };
  return voidResult(
    await toResult(() => proposeTourTime(id, parsed.data.date, parsed.data.time))
  );
}

/** Renter adopts the proposed slot. */
export async function acceptRescheduleAction(
  id: string
): Promise<ActionResult> {
  return voidResult(await toResult(() => acceptReschedule(id)));
}

/* The mutations return the id they touched so a caller could invalidate by it;
   none of these need it, so it's dropped rather than shipped to the client. */
function voidResult(result: ActionResult<string>): ActionResult {
  return result.ok ? { ok: true, data: undefined } : result;
}
