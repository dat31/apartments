import { listMyListings } from "@/lib/services/listings";
import { listLiveTours } from "@/lib/services/tours";
import { isUpcomingTour, needsOwnerResponse } from "./tours";

/* The five figures the dashboard chrome shows. The stat tiles and the nav
   counts are two views of the same numbers, so they derive them in one place
   rather than each filtering the same two lists their own way.

   Both slots call this independently — and the sidebar and the mobile chips
   are two more calls on top. That is affordable because listMyListings and
   listLiveTours are request-memoized (react's cache()), so the layout still
   makes one round trip per table however many components ask.

   The tours figures come off the live window, which is also what the tours tab
   renders: the date cutoff is the query's job, and this only has to split what
   comes back by status. */

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
    listLiveTours("owner"),
  ]);

  return {
    listings: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    drafts: listings.filter((l) => l.status === "draft").length,
    /* Both figures use the predicates the tours tab groups by, so a tile and
       the section under it can't report different numbers. "Needs a response"
       includes a proposed reschedule, which is still the owner's move. */
    pendingTours: tours.filter((m) => needsOwnerResponse(m.tour)).length,
    upcomingTours: tours.filter((m) => isUpcomingTour(m.tour)).length,
  };
}
