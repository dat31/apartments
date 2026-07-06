import { Suspense } from "react";
import { SavedList } from "./components/saved-list";
import { SkeletonGrid } from "@/components/skeleton-listing-card";
import { getActiveListings } from "@/lib/services/listings";

export default function SavedPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-5 sm:px-8 py-8">
          <SkeletonGrid count={3} />
        </div>
      }
    >
      <SavedResults />
    </Suspense>
  );
}

/* The saved shortlist itself lives client-side (react-query, keyed on the
   signed-in user); this just supplies the full active-listing set so the
   client can resolve saved ids to cards and reuse Browse's filter/sort UI.
   getActiveListings() is cached, so this stream is effectively instant. */
async function SavedResults() {
  const listings = await getActiveListings();
  return <SavedList listings={listings} />;
}
