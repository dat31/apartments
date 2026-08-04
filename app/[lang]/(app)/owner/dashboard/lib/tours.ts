import { occupiedSet, tourSlot } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { type TourWithListing } from "@/lib/services/tours";
import { type TourRequest } from "@/schemas/tour";

/* How the tours tab arranges what an owner has received. Pure, so it can be
   tested against fixtures — the service that feeds it can't be (AGENTS.md),
   which makes this the piece worth pinning down. */

export type OwnerTourGroups = {
  /** Pending, and reschedules the owner proposed and is still waiting on. */
  needsResponse: TourWithListing[];
  upcoming: TourWithListing[];
  past: TourWithListing[];
};

/* Ordered by the slot the tour actually holds, not the one originally asked
   for — tourSlot resolves a proposed reschedule to the proposed time. */
const sortKey = (t: TourRequest) => {
  const slot = tourSlot(t);
  return `${slot.date}|${slot.time}`;
};

const bySlot = (a: TourWithListing, b: TourWithListing) =>
  sortKey(a.tour).localeCompare(sortKey(b.tour));

export function groupOwnerTours(items: TourWithListing[]): OwnerTourGroups {
  return {
    needsResponse: items
      .filter(
        (m) => m.tour.status === "pending" || m.tour.status === "reschedule"
      )
      .sort(bySlot),
    upcoming: items.filter((m) => m.tour.status === "confirmed").sort(bySlot),
    // Declined keeps its newest-first order from the query: a closed tour is
    // history, and history reads backwards.
    past: items.filter((m) => m.tour.status === "declined"),
  };
}

/**
 * Slots this owner can't offer when rescheduling `tour` — every other live
 * tour of theirs, as `"date|time"` keys.
 *
 * Computed on the server so the propose-a-time modal doesn't need the whole
 * tour list (or the session) shipped to it just to work out what's taken.
 */
export function occupiedSlotsExcluding(
  items: TourWithListing[],
  tour: TourRequest
): string[] {
  const others = items
    .map((m) => m.tour)
    .filter((t) => t.id !== tour.id);
  return [...occupiedSet(others, tour.ownerKey)];
}
