import { listMyListings } from "@/lib/services/listings";
import { listTours } from "@/lib/services/tours";

/* The five figures the dashboard chrome shows. The stat tiles and the nav
   counts are two views of the same numbers, so they derive them in one place
   rather than each filtering the same two lists their own way.

   Both slots call this independently — and the sidebar and the mobile chips
   are two more calls on top. That is affordable because listMyListings and
   listTours are request-memoized (react's cache()), so the layout still makes
   one round trip per table however many components ask. */

export type DashboardCounts = {
  listings: number;
  active: number;
  drafts: number;
  pendingTours: number;
  upcomingTours: number;
};

export async function dashboardCounts(): Promise<DashboardCounts> {
  const [listings, tours] = await Promise.all([
    listMyListings(),
    listTours("owner"),
  ]);

  return {
    listings: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    drafts: listings.filter((l) => l.status === "draft").length,
    /* "Needs a response" — a proposed reschedule is still the owner's move,
       which is why it counts alongside pending here and in the tours tab. */
    pendingTours: tours.filter(
      (m) => m.tour.status === "pending" || m.tour.status === "reschedule"
    ).length,
    upcomingTours: tours.filter((m) => m.tour.status === "confirmed").length,
  };
}
