import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonListingCard } from "@/components/skeleton-listing-card";

/* Mirrors LandingShowcase's footprint so the static shell doesn't jump when
   the streamed showcase resolves. */
export function LandingShowcaseSkeleton() {
  return (
    <div
      className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 flex flex-col py-16 gap-16"
      aria-hidden="true"
    >
      {/* Browse by district */}
      <section>
        <Skeleton className="skeleton h-8 w-56 mb-4" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="skeleton min-h-[160px] w-full" />
          ))}
        </div>
      </section>

      {/* Newest / Trending carousels */}
      {Array.from({ length: 2 }).map((_, row) => (
        <section key={row}>
          <Skeleton className="skeleton h-8 w-48 mb-4" />
          <div className="flex gap-5 overflow-hidden pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[280px] sm:w-[300px]">
                <SkeletonListingCard />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
