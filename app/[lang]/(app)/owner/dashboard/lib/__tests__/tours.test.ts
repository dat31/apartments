import { describe, expect, it } from "vitest";
import { makeTour } from "@/tests/factories";
import { type TourWithListing } from "@/lib/services/tours";
import { type TourRequest } from "@/schemas/tour";
import { groupLiveOwnerTours, occupiedSlotsExcluding } from "../tours";

const withListing = (tour: TourRequest): TourWithListing => ({
  tour,
  listing: null,
});

/* Every fixture slot is a fixed date in 2026-08, so the "today" the split
   compares against is fixed too — the default (the real Da Nang day) would
   retire the whole month the moment it passed. */
const TODAY = "2026-08-01";

describe("groupLiveOwnerTours", () => {
  it("puts pending and proposed reschedules in the same bucket", () => {
    const groups = groupLiveOwnerTours(
      [
        withListing(makeTour({ id: "p", status: "pending" })),
        withListing(
          makeTour({
            id: "r",
            status: "reschedule",
            proposedDate: "2026-08-02",
            proposedTime: "09:00",
          })
        ),
        withListing(makeTour({ id: "c", status: "confirmed" })),
      ],
      TODAY
    );

    // p keeps the default 2026-08-01 slot; r was proposed for the day after.
    expect(groups.needsResponse.map((m) => m.tour.id)).toEqual(["p", "r"]);
    expect(groups.upcoming.map((m) => m.tour.id)).toEqual(["c"]);
  });

  /* The three below duplicate the cutoff `listLiveTours` already applies in
     SQL, on purpose: these predicates are also what the stat tiles count, so
     they have to hold on their own rather than only in the company of the
     query that feeds them. */

  it("drops a confirmed tour once its day has gone", () => {
    /* `today` itself still counts as upcoming — a tour is over when its day
       is, not when its hour is. */
    const groups = groupLiveOwnerTours(
      [
        withListing(makeTour({ id: "gone", date: "2026-07-31", status: "confirmed" })),
        withListing(makeTour({ id: "today", date: "2026-08-01", status: "confirmed" })),
        withListing(makeTour({ id: "soon", date: "2026-08-09", status: "confirmed" })),
      ],
      TODAY
    );

    expect(groups.upcoming.map((m) => m.tour.id)).toEqual(["today", "soon"]);
  });

  it("drops an unanswered request once its day has gone", () => {
    /* There is nothing left to answer, so it stops asking to be answered. */
    const groups = groupLiveOwnerTours(
      [
        withListing(makeTour({ id: "stale", date: "2026-07-28", status: "pending" })),
        withListing(makeTour({ id: "live", date: "2026-08-05", status: "pending" })),
      ],
      TODAY
    );

    expect(groups.needsResponse.map((m) => m.tour.id)).toEqual(["live"]);
  });

  it("keeps a reschedule by the slot it proposed, not the one first asked for", () => {
    /* The original day has gone but the owner moved it forward, so the tour is
       still live — keying the cutoff on t.date would bury a slot the renter
       has yet to answer. `tours.slot_date` resolves it the same way in SQL. */
    const groups = groupLiveOwnerTours(
      [
        withListing(
          makeTour({
            id: "moved",
            date: "2026-07-25",
            status: "reschedule",
            proposedDate: "2026-08-06",
            proposedTime: "09:00",
          })
        ),
      ],
      TODAY
    );

    expect(groups.needsResponse.map((m) => m.tour.id)).toEqual(["moved"]);
  });

  it("sorts by the slot a tour actually holds, not the one first asked for", () => {
    /* The reschedule was originally booked latest, but the owner proposed the
       earliest slot — so it leads. Sorting on t.date would invert these. */
    const groups = groupLiveOwnerTours(
      [
        withListing(makeTour({ id: "late", date: "2026-08-03", time: "10:00" })),
        withListing(
          makeTour({
            id: "moved",
            date: "2026-08-09",
            time: "16:00",
            status: "reschedule",
            proposedDate: "2026-08-01",
            proposedTime: "08:00",
          })
        ),
        withListing(makeTour({ id: "mid", date: "2026-08-02", time: "10:00" })),
      ],
      TODAY
    );

    expect(groups.needsResponse.map((m) => m.tour.id)).toEqual([
      "moved",
      "mid",
      "late",
    ]);
  });

  it("claims no tour that belongs to history", () => {
    /* History is listPastTours' half of the split, and the two must not both
       show the same tour: whatever the live window lets through, nothing
       declined or elapsed lands in a section here. */
    const groups = groupLiveOwnerTours(
      [
        withListing(makeTour({ id: "declined", date: "2026-08-09", status: "declined" })),
        withListing(makeTour({ id: "elapsed", date: "2026-07-30", status: "confirmed" })),
      ],
      TODAY
    );

    expect(groups).toEqual({ needsResponse: [], upcoming: [] });
  });

  it("returns empty buckets rather than dropping them", () => {
    expect(groupLiveOwnerTours([])).toEqual({
      needsResponse: [],
      upcoming: [],
    });
  });
});

describe("occupiedSlotsExcluding", () => {
  it("holds every other live slot but frees the tour being rescheduled", () => {
    const subject = makeTour({ id: "subject", date: "2026-08-01", time: "10:00" });
    const items = [
      withListing(subject),
      withListing(makeTour({ id: "other", date: "2026-08-02", time: "14:00" })),
    ];

    const occupied = occupiedSlotsExcluding(items, subject);

    expect(occupied).toContain("2026-08-02|14:00");
    // Its own slot stays offerable — an owner may keep the day and move the hour.
    expect(occupied).not.toContain("2026-08-01|10:00");
  });

  it("ignores declined tours and tours belonging to another owner", () => {
    const subject = makeTour({ id: "subject" });
    const occupied = occupiedSlotsExcluding(
      [
        withListing(subject),
        withListing(
          makeTour({ id: "dead", date: "2026-08-05", time: "11:00", status: "declined" })
        ),
        withListing(
          makeTour({
            id: "someone-else",
            date: "2026-08-06",
            time: "12:00",
            ownerKey: "another-owner",
          })
        ),
      ],
      subject
    );

    expect(occupied).toEqual([]);
  });

  it("holds a reschedule at its proposed slot, not its original one", () => {
    const subject = makeTour({ id: "subject" });
    const occupied = occupiedSlotsExcluding(
      [
        withListing(subject),
        withListing(
          makeTour({
            id: "moved",
            date: "2026-08-04",
            time: "09:00",
            status: "reschedule",
            proposedDate: "2026-08-07",
            proposedTime: "15:00",
          })
        ),
      ],
      subject
    );

    expect(occupied).toEqual(["2026-08-07|15:00"]);
  });
});
