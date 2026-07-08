import { coordsOf, type LatLng } from "@/lib/geo";
import { todayYmd } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import type { MyTour } from "@/hooks/use-my-tours";
import type { Listing } from "@/schemas/listing";
import type { TourRequest } from "@/schemas/tour";

/* ============================================================
   Day-level tour planning for the renter's /tour page.
   Pure module — no React. Groups the renter's upcoming tours
   into per-day sections and extracts the routeable stops each
   day (a day with ≥2 stops gets the route map).
   ============================================================ */

/** Assumed length of one home tour, used for gap math between two
    same-day tours. An assumption, not a booking rule — keep it easy
    to change. */
export const TOUR_DURATION_MIN = 30;

/** A routeable stop: an upcoming tour with a live listing to drive to. */
export type TourStop = {
  tour: TourRequest;
  listing: Listing;
  coords: LatLng;
};

export type TourDay = {
  date: string; // YYYY-MM-DD
  /** Every upcoming tour that day, in time order — drives the card list.
      Includes reschedule-status and deleted-listing tours. */
  items: MyTour[];
  /** The routeable subset (pending/confirmed with a live listing), in
      schedule order — drives the route map when there are ≥2. */
  stops: TourStop[];
};

const routeable = (m: MyTour): m is MyTour & { listing: Listing } =>
  m.listing !== null &&
  (m.tour.status === "pending" || m.tour.status === "confirmed");

/** Group the renter's tours into upcoming day sections (date ≥ today,
    not declined), each sorted by time, days in chronological order. */
export function groupTourDays(
  items: MyTour[],
  today: string = todayYmd()
): TourDay[] {
  const byDate = new Map<string, MyTour[]>();
  for (const m of items) {
    if (m.tour.date < today || m.tour.status === "declined") continue;
    const day = byDate.get(m.tour.date);
    if (day) day.push(m);
    else byDate.set(m.tour.date, [m]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => {
      dayItems.sort((a, b) => a.tour.time.localeCompare(b.tour.time));
      return {
        date,
        items: dayItems,
        stops: dayItems
          .filter(routeable)
          .map((m) => ({ tour: m.tour, listing: m.listing, coords: coordsOf(m.listing) })),
      };
    });
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Free minutes between the end of tour A (its start + `tourMin`) and the
    start of tour B — negative when the schedule already overlaps. */
export function legGapMinutes(
  a: TourStop,
  b: TourStop,
  tourMin: number = TOUR_DURATION_MIN
): number {
  return toMinutes(b.tour.time) - toMinutes(a.tour.time) - tourMin;
}

/** Google Maps directions deep link through the given points in order. */
export const gmapsDirectionsUrl = (points: LatLng[]): string =>
  "https://www.google.com/maps/dir/" +
  points.map(([lat, lng]) => `${lat},${lng}`).join("/");
