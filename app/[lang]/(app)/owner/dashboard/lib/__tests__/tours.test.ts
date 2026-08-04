import { describe, expect, it } from "vitest";
import { makeTour } from "@/tests/factories";
import { type TourWithListing } from "@/lib/services/tours";
import { type TourRequest } from "@/schemas/tour";
import { groupOwnerTours, occupiedSlotsExcluding } from "../tours";

const withListing = (tour: TourRequest): TourWithListing => ({
  tour,
  listing: null,
});

describe("groupOwnerTours", () => {
  it("puts pending and proposed reschedules in the same bucket", () => {
    const groups = groupOwnerTours([
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
      withListing(makeTour({ id: "d", status: "declined" })),
    ]);

    // p keeps the default 2026-08-01 slot; r was proposed for the day after.
    expect(groups.needsResponse.map((m) => m.tour.id)).toEqual(["p", "r"]);
    expect(groups.upcoming.map((m) => m.tour.id)).toEqual(["c"]);
    expect(groups.past.map((m) => m.tour.id)).toEqual(["d"]);
  });

  it("sorts by the slot a tour actually holds, not the one first asked for", () => {
    /* The reschedule was originally booked latest, but the owner proposed the
       earliest slot — so it leads. Sorting on t.date would invert these. */
    const groups = groupOwnerTours([
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
    ]);

    expect(groups.needsResponse.map((m) => m.tour.id)).toEqual([
      "moved",
      "mid",
      "late",
    ]);
  });

  it("keeps declined tours in the order they arrived in", () => {
    const groups = groupOwnerTours([
      withListing(makeTour({ id: "newer", date: "2026-08-09", status: "declined" })),
      withListing(makeTour({ id: "older", date: "2026-08-01", status: "declined" })),
    ]);

    expect(groups.past.map((m) => m.tour.id)).toEqual(["newer", "older"]);
  });

  it("returns empty buckets rather than dropping them", () => {
    expect(groupOwnerTours([])).toEqual({
      needsResponse: [],
      upcoming: [],
      past: [],
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
