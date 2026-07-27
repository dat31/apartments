import { describe, expect, it } from "vitest";
import {
  gmapsDirectionsUrl,
  groupTourDays,
  legGapMinutes,
  TOUR_DURATION_MIN,
  type TourStop,
} from "../route-plan";
import type { MyTour } from "@/hooks/use-my-tours";
import type { TourRequest } from "@/schemas/tour";
import { makeListing, makeTour } from "@/tests/factories";

/* groupTourDays takes `today` as a parameter (defaulting to the real clock),
   so these pass it explicitly rather than freezing time. */
const TODAY = "2026-06-15";

const entry = (tour: Partial<TourRequest>, withListing = true): MyTour => ({
  tour: makeTour({ date: TODAY, ...tour }),
  listing: withListing ? makeListing() : null,
});

describe("groupTourDays", () => {
  it("returns nothing for an empty list", () => {
    expect(groupTourDays([], TODAY)).toEqual([]);
  });

  it("drops tours whose date has already passed", () => {
    const days = groupTourDays([entry({ date: "2026-06-14" })], TODAY);
    expect(days).toEqual([]);
  });

  it("keeps today's tours", () => {
    expect(groupTourDays([entry({ date: TODAY })], TODAY)).toHaveLength(1);
  });

  it("drops declined tours whatever their date", () => {
    const days = groupTourDays(
      [entry({ date: "2026-06-20", status: "declined" })],
      TODAY
    );
    expect(days).toEqual([]);
  });

  it("groups by date and orders the days chronologically", () => {
    const days = groupTourDays(
      [entry({ date: "2026-06-20" }), entry({ date: TODAY }), entry({ date: "2026-06-20" })],
      TODAY
    );
    expect(days.map((d) => d.date)).toEqual([TODAY, "2026-06-20"]);
    expect(days[1].items).toHaveLength(2);
  });

  it("orders each day's tours by time", () => {
    const days = groupTourDays(
      [entry({ time: "15:00" }), entry({ time: "09:00" }), entry({ time: "11:00" })],
      TODAY
    );
    expect(days[0].items.map((m) => m.tour.time)).toEqual(["09:00", "11:00", "15:00"]);
  });

  it("keeps reschedule-status tours in the card list", () => {
    const days = groupTourDays([entry({ status: "reschedule" })], TODAY);
    expect(days[0].items).toHaveLength(1);
  });

  describe("routeable stops", () => {
    it("includes pending and confirmed tours with a live listing", () => {
      const days = groupTourDays(
        [entry({ time: "09:00", status: "pending" }), entry({ time: "10:00", status: "confirmed" })],
        TODAY
      );
      expect(days[0].stops).toHaveLength(2);
    });

    it("excludes a tour whose listing has been deleted", () => {
      const days = groupTourDays([entry({ time: "09:00" }, false)], TODAY);
      expect(days[0].items).toHaveLength(1);
      expect(days[0].stops).toHaveLength(0);
    });

    it("excludes reschedule-status tours, which have no agreed slot to drive to", () => {
      const days = groupTourDays([entry({ status: "reschedule" })], TODAY);
      expect(days[0].stops).toHaveLength(0);
    });

    it("carries coordinates for each stop", () => {
      const days = groupTourDays([entry({})], TODAY);
      const [lat, lng] = days[0].stops[0].coords;
      expect(typeof lat).toBe("number");
      expect(typeof lng).toBe("number");
    });

    it("keeps stops in schedule order", () => {
      const days = groupTourDays(
        [entry({ time: "16:00" }), entry({ time: "09:00" })],
        TODAY
      );
      expect(days[0].stops.map((s) => s.tour.time)).toEqual(["09:00", "16:00"]);
    });
  });
});

describe("legGapMinutes", () => {
  const stop = (time: string): TourStop => ({
    tour: makeTour({ time }),
    listing: makeListing(),
    coords: [16, 108],
  });

  it("subtracts the assumed tour length from the gap between start times", () => {
    // 09:00 → 11:00 is 120 minutes; the first tour consumes TOUR_DURATION_MIN.
    expect(legGapMinutes(stop("09:00"), stop("11:00"))).toBe(120 - TOUR_DURATION_MIN);
  });

  it("goes negative when the schedule already overlaps", () => {
    expect(legGapMinutes(stop("09:00"), stop("09:15"))).toBe(15 - TOUR_DURATION_MIN);
    expect(legGapMinutes(stop("09:00"), stop("09:15"))).toBeLessThan(0);
  });

  it("is exactly zero for back-to-back tours", () => {
    expect(legGapMinutes(stop("09:00"), stop("09:30"))).toBe(0);
  });

  it("honours a custom tour length", () => {
    expect(legGapMinutes(stop("09:00"), stop("10:00"), 45)).toBe(15);
  });

  it("handles times that cross an hour boundary", () => {
    expect(legGapMinutes(stop("09:45"), stop("10:45"), 30)).toBe(30);
  });
});

describe("gmapsDirectionsUrl", () => {
  it("joins the points in order", () => {
    expect(gmapsDirectionsUrl([[16.05, 108.22], [16.07, 108.24]])).toBe(
      "https://www.google.com/maps/dir/16.05,108.22/16.07,108.24"
    );
  });

  it("produces a bare base URL for no points", () => {
    expect(gmapsDirectionsUrl([])).toBe("https://www.google.com/maps/dir/");
  });
});
