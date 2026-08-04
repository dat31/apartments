import {
  occupiedSet,
  todayYmd,
  tourSlot,
} from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { type TourWithListing } from "@/lib/services/tours";
import { type TourRequest } from "@/schemas/tour";

/* How the tours tab arranges the tours an owner still has ahead of them. Pure,
   so it can be tested against fixtures — the service that feeds it can't be
   (AGENTS.md), which makes this the piece worth pinning down.

   History is not grouped here: `listPastTours` is its own query, because the
   only way to keep a dashboard read from growing with an owner's whole hosting
   career is to not fetch that career. */

export type OwnerTourGroups = {
  /** Pending, and reschedules the owner proposed and is still waiting on. */
  needsResponse: TourWithListing[];
  upcoming: TourWithListing[];
};

/* The two live buckets, as predicates — the tab groups by them and the stat
   tiles count them, so neither can drift from the other.

   Both are gated on the slot as well as the status, and deliberately still
   are even though `listLiveTours` has already dropped everything elapsed: the
   same predicates decide what a tile counts, and one definition that holds
   wherever it is applied beats two that agree by arrangement. Compared by date
   and not by slot time, matching the renter's /tour page: a tour holds its day
   out, so the two sides never disagree about which day retires it. */

/** Confirmed, and the day hasn't passed. */
export const isUpcomingTour = (t: TourRequest, today: string = todayYmd()) =>
  t.status === "confirmed" && tourSlot(t).date >= today;

/**
 * Still the owner's move: a request they haven't answered, or a reschedule
 * they proposed and are waiting on — in either case for a day still to come.
 *
 * An unanswered request whose day has gone drops out. The owner can no longer
 * respond to it in any way that means anything, so leaving it in the count
 * only accrues chores that can't be done.
 */
export const needsOwnerResponse = (t: TourRequest, today: string = todayYmd()) =>
  (t.status === "pending" || t.status === "reschedule") &&
  tourSlot(t).date >= today;

/* Ordered by the slot the tour actually holds, not the one originally asked
   for — tourSlot resolves a proposed reschedule to the proposed time. */
const sortKey = (t: TourRequest) => {
  const slot = tourSlot(t);
  return `${slot.date}|${slot.time}`;
};

const bySlot = (a: TourWithListing, b: TourWithListing) =>
  sortKey(a.tour).localeCompare(sortKey(b.tour));

/**
 * Split an owner's live tours into the two sections the tab shows.
 *
 * Takes the live window (`listLiveTours`), not every tour: anything declined
 * or elapsed belongs to `listPastTours` and would find no bucket here.
 * `today` is injectable so the split can be tested against fixed slots.
 */
export function groupLiveOwnerTours(
  items: TourWithListing[],
  today: string = todayYmd()
): OwnerTourGroups {
  return {
    needsResponse: items
      .filter((m) => needsOwnerResponse(m.tour, today))
      .sort(bySlot),
    upcoming: items.filter((m) => isUpcomingTour(m.tour, today)).sort(bySlot),
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
