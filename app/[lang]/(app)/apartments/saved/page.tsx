import { Suspense } from "react";
import { SavedList } from "./components/saved-list";
import { SkeletonGrid } from "@/components/skeleton-listing-card";
import { SEED_LISTINGS } from "@/lib/data/listings";

export default function SavedPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-5 sm:px-8 py-8">
          <SkeletonGrid count={3} />
        </div>
      }
    >
      <SavedList listings={SEED_LISTINGS} />
    </Suspense>
  );
}
